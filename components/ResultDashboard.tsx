import React, { useState, useEffect } from 'react';
import { Trip, DispatchSummary } from '../types';
import { ICONS, DEPOT } from '../constants';
import * as XLSX from 'xlsx';
import RouteMap, { MapLayer } from './RouteMap';

interface ResultDashboardProps {
  trips: Trip[];
  summary: DispatchSummary;
}

const ResultDashboard: React.FC<ResultDashboardProps> = ({ trips, summary }) => {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>(MapLayer.TECH);
  const [hoveredStop, setHoveredStop] = useState<number | null>(null);

  // 初始化选中第一个车次
  useEffect(() => {
    if (trips.length > 0 && !selectedTripId) {
      setSelectedTripId(trips[0].id);
    }
  }, [trips]);

  const selectedTrip = trips.find(t => t.id === selectedTripId);

  const downloadExcel = () => {
    const rows = trips.flatMap(t => t.orders.map((o, idx) => {
      const stop = t.stops.find(s => s.orderNo === o.orderNo);
      return {
        '车次编号': t.id,
        '发货基地': t.depot?.name || '默认仓',
        '推荐车型': t.vehicle.type,
        '车辆载重(kg)': t.vehicle.capacityKg,
        '整车托盘位': t.vehicle.capacityPallets,
        '串点顺序': idx + 1,
        '送货单号': o.orderNo,
        '收方名称': o.receiver,
        '送货地址': o.address,
        '重量(kg)': o.weightKg,
        '托盘数': o.pallets,
        '预计提货时间': '06:30', 
        '预计到达时间': stop?.eta || '待定',
        '整车总里程(km)': t.totalDistance,
        '整车总时长(h)': t.totalDuration,
        '起步价': t.vehicle.baseCost,
        '里程费率': t.vehicle.costPerKm,
        '整车预估总成本': t.estimatedCost.toFixed(2),
        '异常标记': (o.isGeoFault) ? '地址坐标风险' : '正常'
      };
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "智能调度方案");
    XLSX.writeFile(wb, `NanoDispatch_Plan_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!selectedTrip) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 顶部控制栏 */}
      <div className="glass-panel p-4 rounded-3xl border-slate-800 flex justify-between items-center bg-slate-900/60">
         <div className="flex items-center gap-4 px-2">
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Result View</span>
            </div>
            <div className="h-4 w-[1px] bg-slate-700"></div>
            <span className="text-xs font-mono text-slate-500">{trips.length} TRIPS GENERATED</span>
         </div>
         <button 
           onClick={downloadExcel}
           className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
         >
           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
           Export Excel
         </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[800px]">
        {/* 左侧：车次列表 (Trip Roster) */}
        <div className="xl:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 no-scrollbar">
           {trips.map(trip => {
             const isActive = trip.id === selectedTripId;
             const loadRate = (trip.totalWeight / trip.vehicle.capacityKg) * 100;
             const isOverload = loadRate > 100;
             
             return (
               <div 
                 key={trip.id}
                 onClick={() => setSelectedTripId(trip.id)}
                 className={`group p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
                   isActive 
                   ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-900/50' 
                   : 'bg-slate-900/40 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                 }`}
               >
                 {/* 背景装饰 */}
                 {isActive && <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>}

                 <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                       <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>Trip ID</div>
                       <div className={`text-xl font-black font-mono ${isActive ? 'text-white' : 'text-slate-200'}`}>{trip.id}</div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                      isActive ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-950 border-slate-700 text-slate-400'
                    }`}>
                       {trip.vehicle.type}
                    </div>
                 </div>

                 <div className="space-y-3 relative z-10">
                    <div className="flex justify-between text-[10px] font-mono">
                       <span className={isActive ? 'text-blue-100' : 'text-slate-500'}>WEIGHT LOAD</span>
                       <span className={isOverload ? 'text-red-400' : isActive ? 'text-white' : 'text-slate-300'}>{loadRate.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                       <div className={`h-full rounded-full ${isOverload ? 'bg-red-500' : 'bg-emerald-400'}`} style={{ width: `${Math.min(loadRate, 100)}%` }}></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                       <div>
                          <span className={`block text-[9px] font-bold uppercase ${isActive ? 'text-blue-200' : 'text-slate-600'}`}>Distance</span>
                          <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>{trip.totalDistance} km</span>
                       </div>
                       <div className="text-right">
                          <span className={`block text-[9px] font-bold uppercase ${isActive ? 'text-blue-200' : 'text-slate-600'}`}>Est. Cost</span>
                          <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>¥{Math.round(trip.estimatedCost)}</span>
                       </div>
                    </div>
                 </div>
               </div>
             )
           })}
        </div>

        {/* 右侧：详情视图 (Details View) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
           {/* 地图区域 */}
           <div className="flex-1 glass-panel rounded-3xl border-slate-800 overflow-hidden relative group min-h-[400px]">
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                 {[MapLayer.TECH, MapLayer.SATELLITE, MapLayer.TRAFFIC].map(layer => (
                   <button 
                     key={layer}
                     onClick={() => setActiveLayer(layer)}
                     className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase backdrop-blur-md border transition-all ${
                       activeLayer === layer 
                       ? 'bg-blue-600/80 text-white border-blue-500' 
                       : 'bg-slate-950/50 text-slate-400 border-slate-700 hover:bg-slate-900'
                     }`}
                   >
                     {layer} Mode
                   </button>
                 ))}
              </div>
              
              <div className="w-full h-full">
                <RouteMap 
                  selectedTrip={selectedTrip} 
                  depot={trips[0].depot || DEPOT} 
                  layer={activeLayer}
                  hoveredStopSeq={hoveredStop}
                />
              </div>

              {/* 悬浮数据层 */}
              <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-4">
                 {[
                   { label: 'Total Stops', val: selectedTrip.stops.length },
                   { label: 'Utilized Kg', val: selectedTrip.totalWeight },
                   { label: 'Utilized Pallets', val: selectedTrip.totalPallets }
                 ].map((stat, i) => (
                   <div key={i} className="bg-slate-950/80 backdrop-blur border border-slate-800 p-3 rounded-xl">
                      <div className="text-[9px] text-slate-500 font-black uppercase">{stat.label}</div>
                      <div className="text-sm font-bold text-white font-mono">{stat.val}</div>
                   </div>
                 ))}
              </div>
           </div>

           {/* 站点明细表 (Manifest) */}
           <div className="h-[300px] glass-panel rounded-3xl border-slate-800 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                 <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <ICONS.Truck />
                    Delivery Manifest
                 </h3>
                 <span className="text-[10px] font-mono text-slate-500">{selectedTrip.vehicle.type} • {selectedTrip.stops.length} STOPS</span>
              </div>
              <div className="flex-1 overflow-auto">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-950/30 sticky top-0 z-10 backdrop-blur-sm">
                       <tr>
                          {['Seq', 'Time', 'Order No', 'Destination', 'Cargo', 'Dist'].map(h => (
                            <th key={h} className="px-6 py-3 text-[9px] font-black text-slate-500 uppercase tracking-wider">{h}</th>
                          ))}
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                       {selectedTrip.stops.map((stop, idx) => {
                         const order = selectedTrip.orders.find(o => o.orderNo === stop.orderNo);
                         const isRisk = order?.isGeoFault;
                         
                         return (
                           <tr 
                             key={stop.orderNo} 
                             className="hover:bg-blue-600/5 transition-colors group cursor-default"
                             onMouseEnter={() => setHoveredStop(stop.seq)}
                             onMouseLeave={() => setHoveredStop(null)}
                           >
                              <td className="px-6 py-3">
                                 <span className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 text-slate-300 text-[10px] font-mono font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    {stop.seq}
                                 </span>
                              </td>
                              <td className="px-6 py-3 text-[10px] font-mono text-slate-400 font-bold">{stop.eta}</td>
                              <td className="px-6 py-3 text-[10px] font-mono text-blue-400">{stop.orderNo}</td>
                              <td className="px-6 py-3">
                                 <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-300 font-medium truncate max-w-[150px]">{stop.address}</span>
                                    {isRisk && (
                                      <span className="text-[8px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">LBS Risk</span>
                                    )}
                                 </div>
                              </td>
                              <td className="px-6 py-3 text-[10px] text-slate-400">
                                 {order?.weightKg}kg <span className="text-slate-600 mx-1">/</span> {order?.pallets}plts
                              </td>
                              <td className="px-6 py-3 text-[10px] font-mono text-emerald-500">
                                 +{stop.distanceFromPrev}km
                              </td>
                           </tr>
                         );
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ResultDashboard;