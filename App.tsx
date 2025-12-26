import React, { useState, useEffect, useRef } from 'react';
import { ICONS, DEPOT, INITIAL_FLEET_CONFIG } from './constants';
import { Order, Trip, DispatchStep, DispatchSummary, Vehicle, FleetConfigItem, FileHistoryItem, Depot, DispatchMode, MapProvider, Stop } from './types';
import Header from './components/Header';
import ConfigPanel from './components/ConfigPanel';
import UploadArea from './components/UploadArea';
import ProgressMonitor from './components/ProgressMonitor';
import ResultDashboard from './components/ResultDashboard';
import SummaryReport from './components/SummaryReport';
import TechExpositor from './components/TechExpositor';

// 生产级 API 安全管理
const AVG_SPEED_KMH = 48; 
const SERVICE_TIME_PER_STOP = 25; 
const ROUTE_DETOUR_FACTOR = 1.32; 
const GEO_CACHE_KEY = 'NANO_LOGISTICS_GEO_CACHE_V5_STABLE'; 
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

let MEMORY_GEO_CACHE: Record<string, { lat: number, lng: number, timestamp?: number }> | null = null;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('INPUT');
  const [orders, setOrders] = useState<Order[]>([]);
  const [step, setStep] = useState<DispatchStep>(DispatchStep.IDLE);
  const [progress, setProgress] = useState(0);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [summary, setSummary] = useState<DispatchSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const stopSignal = useRef(false);

  // 配置状态
  const [maxStops, setMaxStops] = useState(8);
  const [startTime, setStartTime] = useState('07:00');
  const [deadline, setDeadline] = useState('20:00');
  const [fleetConfig, setFleetConfig] = useState<Record<string, FleetConfigItem>>(INITIAL_FLEET_CONFIG);
  const [dispatchMode, setDispatchMode] = useState<DispatchMode>(DispatchMode.SINGLE_TO_MULTI);
  const [depots, setDepots] = useState<Depot[]>([{ id: 'depot-primary', ...DEPOT }]);
  const [mapProvider, setMapProvider] = useState<MapProvider>(MapProvider.AMAP);
  const [amapKey, setAmapKey] = useState('41476da8b99afb1e40e3d2ac7ecc3e41');

  const addDepot = () => {
    const newDepot: Depot = {
      id: `depot-${Math.random().toString(36).substr(2, 9)}`,
      name: '新增分仓资产',
      address: '江苏省苏州市',
      lng: depots[0].lng + (Math.random() - 0.5) * 0.05,
      lat: depots[0].lat + (Math.random() - 0.5) * 0.05
    };
    setDepots(prev => [...prev, newDepot]);
  };

  const removeDepot = (id: string) => {
    if (depots.length <= 1) return;
    setDepots(prev => prev.filter(d => d.id !== id));
  };

  const loadCache = () => {
    if (!MEMORY_GEO_CACHE) {
      try {
        const raw = localStorage.getItem(GEO_CACHE_KEY);
        MEMORY_GEO_CACHE = raw ? JSON.parse(raw) : {};
      } catch (e) { MEMORY_GEO_CACHE = {}; }
    }
    return MEMORY_GEO_CACHE!;
  };

  const getGeocode = async (address: string): Promise<{ lat: number, lng: number, isFault?: boolean }> => {
    const cache = loadCache();
    if (cache[address] && cache[address].timestamp && (Date.now() - cache[address].timestamp < CACHE_EXPIRATION_MS)) {
      return { ...cache[address], isFault: false };
    }

    if (mapProvider === MapProvider.OFFLINE || !amapKey) {
      return { lat: depots[0].lat + (Math.random() - 0.5) * 0.4, lng: depots[0].lng + (Math.random() - 0.5) * 0.4, isFault: true };
    }

    try {
      const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${amapKey}&city=${encodeURIComponent('江苏|上海')}`;
      const res = await fetch(url).catch(() => { throw new Error('NETWORK_FAIL'); });
      const data = await res.json();
      
      if (data.status === '1' && data.geocodes?.length > 0) {
        const loc = data.geocodes[0].location.split(',');
        const result = { lng: parseFloat(loc[0]), lat: parseFloat(loc[1]), timestamp: Date.now() };
        cache[address] = result;
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
        return { ...result, isFault: false };
      }
    } catch (e) {
      console.warn(`[LBS] 失败安全兜底: ${address}`);
    }
    return { lat: depots[0].lat + (Math.random() - 0.5) * 0.1, lng: depots[0].lng + (Math.random() - 0.5) * 0.1, isFault: true };
  };

  const calcDist = (p1: {lat: number, lng: number}, p2: {lat: number, lng: number}) => {
    const dLat = Math.abs(p1.lat - p2.lat) * 111;
    const dLng = Math.abs(p1.lng - p2.lng) * 111 * Math.cos(p1.lat * Math.PI / 180);
    return (dLat + dLng) * ROUTE_DETOUR_FACTOR;
  };

  const solveDispatch = async () => {
    if (orders.length === 0) return;
    setIsProcessing(true);
    stopSignal.current = false;
    setStep(DispatchStep.GEOCODING);
    setProgress(5);

    // 显式映射属性，避免 Spread types error 并确保接口兼容
    const vehicles: Vehicle[] = (Object.entries(fleetConfig) as [string, FleetConfigItem][])
      .map(([name, cfg]) => ({ 
        id: name, 
        type: name, 
        capacityKg: cfg.max_kg,
        capacityPallets: cfg.slots,
        baseCost: cfg.cost_base,
        costPerKm: cfg.cost_km,
        tags: []
      }))
      .sort((a, b) => a.capacityKg - b.capacityKg);
    
    const geoOrders: Order[] = [];
    const geoFailures: string[] = [];

    for (let i = 0; i < orders.length; i++) {
      if (stopSignal.current) break;
      const order = orders[i];
      if (!order) continue; 

      const res = await getGeocode(order.address);
      if (res.isFault) geoFailures.push(order.orderNo);
      const angle = Math.atan2(res.lat - depots[0].lat, res.lng - depots[0].lng);
      geoOrders.push({ 
        ...order, 
        lat: res.lat,
        lng: res.lng,
        isGeoFault: res.isFault,
        angle 
      });
      setProgress(5 + (i / orders.length) * 35);
    }

    if (stopSignal.current) { setIsProcessing(false); setStep(DispatchStep.IDLE); return; }

    setStep(DispatchStep.OPTIMIZING);
    const sorted = geoOrders.sort((a, b) => a.angle! - b.angle!);
    const finalTrips: Trip[] = [];
    const fleetMix: Record<string, number> = {};

    let currentGroup: Order[] = [];
    let curW = 0, curP = 0;
    const absMaxV = vehicles[vehicles.length - 1];

    sorted.forEach((o, idx) => {
      if (curW + o.weightKg > absMaxV.capacityKg || curP + o.pallets > absMaxV.capacityPallets || currentGroup.length >= maxStops) {
        if (currentGroup.length > 0) createTrip(currentGroup);
        currentGroup = [o]; curW = o.weightKg; curP = o.pallets;
      } else {
        currentGroup.push(o); curW += o.weightKg; curP += o.pallets;
      }
      if (idx === sorted.length - 1 && currentGroup.length > 0) createTrip(currentGroup);
    });

    function createTrip(group: Order[]) {
      const wSum = group.reduce((s, o) => s + o.weightKg, 0);
      const pSum = group.reduce((s, o) => s + o.pallets, 0);
      // 根据实际载重选择最小可用车型
      const v = vehicles.find(v => v.capacityKg >= wSum && v.capacityPallets >= pSum) || absMaxV;
      
      let dTotal = 0;
      let lastPos = { lat: depots[0].lat, lng: depots[0].lng };
      const stops: Stop[] = [];
      
      group.forEach((s, i) => {
        const targetPos = { lat: s.lat || 0, lng: s.lng || 0 };
        const dist = calcDist(lastPos, targetPos);
        dTotal += dist;
        const etaTotalMin = (dTotal / AVG_SPEED_KMH) * 60 + i * SERVICE_TIME_PER_STOP;
        const [h, m] = startTime.split(':').map(Number);
        const finalTime = new Date();
        finalTime.setHours(h, m + etaTotalMin);
        
        stops.push({ 
          seq: i + 1, 
          orderNo: s.orderNo, 
          address: s.address, 
          eta: finalTime.toTimeString().slice(0, 5), 
          distanceFromPrev: parseFloat(dist.toFixed(1)) 
        });
        lastPos = targetPos;
      });
      dTotal += calcDist(lastPos, depots[0]);

      fleetMix[v.type] = (fleetMix[v.type] || 0) + 1;
      finalTrips.push({
        id: `T-${101 + finalTrips.length}`,
        vehicle: v,
        orders: group, totalWeight: wSum, totalPallets: pSum,
        totalDistance: parseFloat(dTotal.toFixed(1)),
        totalDuration: parseFloat((dTotal / AVG_SPEED_KMH).toFixed(1)),
        estimatedCost: v.baseCost + dTotal * v.costPerKm,
        stops, depot: depots[0]
      });
    }

    setTrips(finalTrips);
    setSummary({
      totalOrders: orders.length,
      totalTrips: finalTrips.length,
      fleetMix,
      totalDistance: finalTrips.reduce((s, t) => s + t.totalDistance, 0),
      totalCost: finalTrips.reduce((s, t) => s + t.estimatedCost, 0),
      avgLoadingRate: finalTrips.reduce((s, t) => s + (t.totalWeight / t.vehicle.capacityKg), 0) / (finalTrips.length || 1),
      riskOrders: geoFailures
    });

    setStep(DispatchStep.COMPLETED);
    setIsProcessing(false);
    setActiveTab('RESULTS');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Header />
      <nav className="sticky top-16 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-[1440px] mx-auto px-6 flex gap-4 py-4 overflow-x-auto no-scrollbar">
          {['INPUT', 'RESULTS', 'REPORT', 'DOCS'].map(id => (
            <button key={id} 
              disabled={id !== 'INPUT' && id !== 'DOCS' && trips.length === 0} 
              onClick={() => setActiveTab(id)}
              className={`px-6 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:text-slate-300'}`}>
              {id === 'INPUT' ? '1. 运单建模' : id === 'RESULTS' ? '2. 智调结果' : id === 'REPORT' ? '3. 运营效能' : '4. 算法白皮书'}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-[1440px] mx-auto px-6 py-8">
        {activeTab === 'INPUT' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: ACTION CENTER (Sticky) */}
            <div className="lg:col-span-4 space-y-6 sticky top-28">
              <UploadArea onUpload={(data) => { 
                setOrders(data); 
                setTrips([]); 
                setSummary(null); 
              }} />
              
              {/* Contextual Action Panel */}
              <div className="glass-panel p-1 rounded-[32px] border-slate-800 bg-slate-900/40 overflow-hidden transition-all duration-500">
                {isProcessing ? (
                   <div className="p-1">
                      <ProgressMonitor step={step} progress={progress} />
                      <button onClick={() => stopSignal.current = true} className="w-full mt-2 py-3 bg-rose-600/10 border border-rose-500/20 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">
                        紧急终止 (EMERGENCY HALT)
                      </button>
                   </div>
                ) : (
                   <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                         <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <span className={`w-2 h-2 rounded-full ${orders.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></span>
                           Engine Status
                         </h3>
                         <span className="text-[10px] font-mono text-slate-500">{orders.length} ORDERS LOADED</span>
                      </div>
                      
                      <button onClick={solveDispatch} disabled={orders.length === 0} className="group w-full py-8 bg-white text-slate-950 rounded-[24px] font-black text-xl hover:scale-[1.02] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed">
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                         <div className="p-2 bg-slate-950 text-white rounded-xl group-hover:rotate-[15deg] transition-transform">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                         </div>
                         启动纳米智能引擎
                      </button>
                      
                      {orders.length === 0 && (
                        <p className="text-center text-[10px] text-slate-600 mt-4 font-mono">PLEASE UPLOAD DATA TO ACTIVATE</p>
                      )}
                   </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: CONFIGURATION DECK */}
            <div className="lg:col-span-8">
              <div className="mb-6 flex items-center justify-between pl-2">
                  <h2 className="text-xl font-black text-white flex items-center gap-3">
                    调度参数配置 
                    <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded-lg tracking-wider">CONFIGURATION DECK</span>
                  </h2>
                  <div className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  </div>
              </div>
              <ConfigPanel 
                params={{ maxStops, startTime, deadline, fleetConfig, depots, dispatchMode, mapProvider, amapKey }} 
                setParams={{ setMaxStops, setStartTime, setDeadline, setFleetConfig, setDepots, setDispatchMode, setMapProvider, addDepot, removeDepot, setAmapKey }} 
              />
            </div>
          </div>
        )}
        {activeTab === 'RESULTS' && <ResultDashboard trips={trips} summary={summary!} />}
        {activeTab === 'REPORT' && <SummaryReport summary={summary!} />}
        {activeTab === 'DOCS' && <TechExpositor />}
      </main>
    </div>
  );
};

export default App;