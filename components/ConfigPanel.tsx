import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { FleetConfigItem, Depot, DispatchMode, MapProvider } from '../types';

interface ConfigPanelProps {
  params: {
    maxStops: number;
    startTime: string;
    deadline: string;
    fleetConfig: Record<string, FleetConfigItem>;
    depots: Depot[];
    dispatchMode: DispatchMode;
    mapProvider: MapProvider;
    amapKey: string;
  };
  setParams: {
    setMaxStops: (v: number) => void;
    setStartTime: (v: string) => void;
    setDeadline: (v: string) => void;
    setFleetConfig: (v: Record<string, FleetConfigItem>) => void;
    setDepots: (v: Depot[]) => void;
    setDispatchMode: (v: DispatchMode) => void;
    setMapProvider: (v: MapProvider) => void;
    addDepot: () => void;
    removeDepot: (id: string) => void;
    setAmapKey: (v: string) => void;
  };
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ params, setParams }) => {
  const [activeSection, setActiveSection] = useState<'depot' | 'basic' | 'fleet' | 'cache' | null>('basic');
  const [jsonView, setJsonView] = useState(false);
  const [jsonInput, setJsonInput] = useState(JSON.stringify(params.fleetConfig, null, 2));
  const [cacheCount, setCacheCount] = useState(0);

  useEffect(() => {
    setJsonInput(JSON.stringify(params.fleetConfig, null, 2));
    updateCacheCount();
  }, [params.fleetConfig]);

  const updateCacheCount = () => {
    try {
      const raw = localStorage.getItem('NANO_LOGISTICS_GEO_CACHE_V5_STABLE'); // Ensure key matches App.tsx
      if (raw) {
        const cache = JSON.parse(raw);
        setCacheCount(Object.keys(cache).length);
      } else {
        setCacheCount(0);
      }
    } catch (e) { setCacheCount(0); }
  };

  const clearCache = () => {
    if (window.confirm('确定要清空本地地址缓存吗？这会导致下次调度重新调用 API 接口。')) {
      localStorage.removeItem('NANO_LOGISTICS_GEO_CACHE_V5_STABLE'); // Ensure key matches App.tsx
      updateCacheCount();
      window.location.reload(); 
    }
  };

  const toggleSection = (section: 'depot' | 'basic' | 'fleet' | 'cache') => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleJsonUpdate = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setParams.setFleetConfig(parsed);
    } catch (e) { alert('JSON 结构错误'); }
  };

  const updateVehicle = (name: string, field: keyof FleetConfigItem, value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    setParams.setFleetConfig({ ...params.fleetConfig, [name]: { ...params.fleetConfig[name], [field]: numValue } });
  };

  const updateDepotField = (id: string, field: keyof Depot, value: string | number) => {
    const newDepots = params.depots.map(d => d.id === id ? { ...d, [field]: (field === 'lng' || field === 'lat') ? parseFloat(value.toString()) || 0 : value } : d);
    setParams.setDepots(newDepots);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[32px] p-2 border-slate-800 shadow-2xl bg-slate-900/40">
         <div className="flex items-stretch gap-2">
            {[
              { id: MapProvider.AMAP, label: '高德路网 (AMAP)', icon: '🌏', desc: '生产级 API 调度' },
              { id: MapProvider.GOOGLE, label: 'Google Maps', icon: '🌐', desc: '全球路径覆盖' },
              { id: MapProvider.OFFLINE, label: '离线估算模式', icon: '🛰️', desc: '本地数学推演' }
            ].map(engine => (
              <button 
                key={engine.id}
                onClick={() => setParams.setMapProvider(engine.id)}
                className={`flex-1 p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 relative group overflow-hidden ${
                  params.mapProvider === engine.id 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{engine.icon}</span>
                <div className="text-center">
                    <span className="block text-[10px] font-black uppercase tracking-widest">{engine.label}</span>
                    <span className={`block text-[8px] font-mono mt-0.5 ${params.mapProvider === engine.id ? 'text-blue-100' : 'text-slate-600'}`}>
                      {engine.desc}
                    </span>
                </div>
                {params.mapProvider === engine.id && (
                  <div className="absolute top-1 right-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                  </div>
                )}
              </button>
            ))}
         </div>

         {/* 高德 Key 输入区域 - 仅在选择 AMAP 时显示 */}
         {params.mapProvider === MapProvider.AMAP && (
            <div className="mt-2 px-2 pb-2 animate-in fade-in slide-in-from-top-1">
               <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-blue-500/20 shadow-inner">
                  <div className="flex items-center gap-2 px-2 border-r border-slate-800 pr-3">
                     <span className="text-[10px] font-black uppercase text-blue-400 whitespace-nowrap">API Key</span>
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  </div>
                  <input
                     type="text"
                     value={params.amapKey}
                     onChange={(e) => setParams.setAmapKey(e.target.value)}
                     className="flex-1 bg-transparent border-none outline-none text-[11px] font-mono text-white placeholder-slate-600 tracking-wide"
                     placeholder="请输入高德地图 Web 服务 Key"
                  />
                  <div className="hidden sm:block text-[9px] text-slate-600 font-mono border border-slate-700 px-1.5 py-0.5 rounded">
                     WEB SERVICE
                  </div>
               </div>
            </div>
         )}
      </div>

      <div className="space-y-4">
        <div className="glass-panel rounded-[28px] border-slate-800 shadow-xl overflow-hidden group">
          <button onClick={() => toggleSection('basic')} className={`w-full px-8 py-6 flex items-center justify-between transition-all ${activeSection === 'basic' ? 'bg-blue-600/5' : 'hover:bg-slate-800/40'}`}>
            <div className="flex items-center gap-5">
              <div className={`p-3 rounded-2xl transition-all duration-500 ${activeSection === 'basic' ? 'bg-blue-600 text-white rotate-12 shadow-lg shadow-blue-600/30' : 'bg-slate-800 text-slate-500'}`}>
                <ICONS.Settings />
              </div>
              <div className="text-left">
                <span className="block font-black text-sm text-slate-100 uppercase tracking-widest leading-none">智算策略核心参数</span>
                <span className="text-[10px] text-slate-500 font-mono mt-1.5">模式: {params.dispatchMode === DispatchMode.MULTI_TO_MULTI ? '多仓协同' : '一仓送多点'}</span>
              </div>
            </div>
            <svg className={`w-5 h-5 text-slate-600 transition-transform duration-500 ${activeSection === 'basic' ? 'rotate-180 text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
          </button>
          
          {activeSection === 'basic' && (
            <div className="px-8 pb-8 pt-2 space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">单车最大串点上限</label>
                  <div className="relative">
                    <input type="number" value={params.maxStops} onChange={(e) => setParams.setMaxStops(parseInt(e.target.value))} className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-mono text-emerald-400 outline-none focus:border-blue-500 focus:bg-slate-900 transition-all" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-700 uppercase">Stops</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">调度业务链路模式</label>
                  <div className="flex gap-2 p-1.5 bg-slate-950 rounded-[20px] border border-slate-800">
                    <button onClick={() => setParams.setDispatchMode(DispatchMode.SINGLE_TO_MULTI)} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${params.dispatchMode === DispatchMode.SINGLE_TO_MULTI ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>一仓送多点</button>
                    <button onClick={() => setParams.setDispatchMode(DispatchMode.MULTI_TO_MULTI)} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${params.dispatchMode === DispatchMode.MULTI_TO_MULTI ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>多仓协同</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                   <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">首单提货时间 (ETD)</label>
                   <input type="time" value={params.startTime} onChange={(e) => setParams.setStartTime(e.target.value)} className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-200 outline-none focus:border-blue-500 transition-all" />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">末端交付截单 (DL)</label>
                   <input type="time" value={params.deadline} onChange={(e) => setParams.setDeadline(e.target.value)} className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-200 outline-none focus:border-blue-500 transition-all" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-[28px] border-slate-800 shadow-xl overflow-hidden">
          <button onClick={() => toggleSection('depot')} className={`w-full px-8 py-6 flex items-center justify-between transition-all ${activeSection === 'depot' ? 'bg-blue-600/5' : 'hover:bg-slate-800/40'}`}>
            <div className="flex items-center gap-5">
              <div className={`p-3 rounded-2xl transition-all duration-500 ${activeSection === 'depot' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-800 text-slate-500'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <div className="text-left">
                <span className="block font-black text-sm text-slate-100 uppercase tracking-widest leading-none">发货基地资产库</span>
                <span className="text-[10px] text-slate-500 font-mono mt-1.5">{params.depots.length} DEPOTS ACTIVE</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {params.dispatchMode === DispatchMode.MULTI_TO_MULTI && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setParams.addDepot(); }} 
                  className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                >
                  添加仓库
                </button>
              )}
              <svg className={`w-5 h-5 text-slate-600 transition-transform duration-500 ${activeSection === 'depot' ? 'rotate-180 text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </button>
          
          {activeSection === 'depot' && (
            <div className="px-8 pb-8 pt-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
               {params.depots.map((depot, index) => (
                 <div key={depot.id} className="p-6 bg-slate-950/40 border border-slate-800 rounded-3xl space-y-4 relative group/card">
                    <div className="flex justify-between items-center">
                       <input 
                         type="text" 
                         value={depot.name} 
                         onChange={(e) => updateDepotField(depot.id, 'name', e.target.value)} 
                         className="bg-transparent font-black text-sm text-white outline-none focus:text-blue-400 transition-colors" 
                       />
                       <div className="flex items-center gap-3">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black ${index === 0 ? 'bg-blue-600/10 text-blue-500' : 'bg-slate-800 text-slate-500'}`}>
                            {index === 0 ? '主仓库 (PRIMARY)' : `备选仓库-${index}`}
                          </span>
                          {index !== 0 && (
                            <button 
                              onClick={() => setParams.removeDepot(depot.id)}
                              className="text-slate-600 hover:text-red-500 transition-colors p-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                       </div>
                    </div>
                    <div className="space-y-3">
                       <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-600 font-black uppercase w-12">地址</span>
                          <input type="text" value={depot.address} onChange={(e) => updateDepotField(depot.id, 'address', e.target.value)} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-400 outline-none focus:border-blue-500/50" />
                       </div>
                       <div className="flex gap-4">
                          <div className="flex-1 flex items-center gap-3">
                             <span className="text-[10px] text-slate-600 font-black uppercase w-12">经度</span>
                             <input type="number" step="0.0001" value={depot.lng} onChange={(e) => updateDepotField(depot.id, 'lng', e.target.value)} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-mono text-slate-400 outline-none focus:border-blue-500/50" />
                          </div>
                          <div className="flex-1 flex items-center gap-3">
                             <span className="text-[10px] text-slate-600 font-black uppercase w-12">纬度</span>
                             <input type="number" step="0.0001" value={depot.lat} onChange={(e) => updateDepotField(depot.id, 'lat', e.target.value)} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-mono text-slate-400 outline-none focus:border-blue-500/50" />
                          </div>
                       </div>
                    </div>
                 </div>
               ))}
               {params.dispatchMode === DispatchMode.SINGLE_TO_MULTI && params.depots.length > 1 && (
                 <p className="text-[9px] text-amber-500 font-bold bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 italic text-center">
                   当前为「一仓送多点」模式，系统将仅使用“主仓库”作为提货点，其余备选仓库已忽略。
                 </p>
               )}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-[28px] border-slate-800 shadow-xl overflow-hidden">
          <button onClick={() => toggleSection('fleet')} className={`w-full px-8 py-6 flex items-center justify-between transition-all ${activeSection === 'fleet' ? 'bg-blue-600/5' : 'hover:bg-slate-800/40'}`}>
            <div className="flex items-center gap-5">
              <div className={`p-3 rounded-2xl transition-all duration-500 ${activeSection === 'fleet' ? 'bg-blue-600 text-white -rotate-12 shadow-lg shadow-blue-600/30' : 'bg-slate-800 text-slate-500'}`}>
                <ICONS.TruckConfig />
              </div>
              <div className="text-left">
                <span className="block font-black text-sm text-slate-100 uppercase tracking-widest leading-none">承运商运力引擎</span>
                <span className="text-[10px] text-slate-500 font-mono mt-1.5">{Object.keys(params.fleetConfig).length} VEHICLE MODELS CONFIGURED</span>
              </div>
            </div>
            <svg className={`w-5 h-5 text-slate-600 transition-transform duration-500 ${activeSection === 'fleet' ? 'rotate-180 text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
          </button>
          
          {activeSection === 'fleet' && (
            <div className="px-8 pb-8 pt-2 space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
               <div className="flex gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 mb-2">
                 <button onClick={() => setJsonView(false)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${!jsonView ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>列表编辑</button>
                 <button onClick={() => setJsonView(true)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${jsonView ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>JSON 高级模式</button>
               </div>

               {jsonView ? (
                 <div className="space-y-4">
                    <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} className="w-full h-64 bg-slate-950 p-4 font-mono text-xs text-blue-400 border border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500" />
                    <button onClick={handleJsonUpdate} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg">应用 JSON 配置</button>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                    {(Object.entries(params.fleetConfig) as [string, FleetConfigItem][]).map(([name, cfg]) => (
                      <div key={name} className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl group hover:border-slate-700 transition-colors">
                         <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-black text-white">{name}</span>
                            <span className="text-[10px] font-mono text-slate-600 uppercase">Vehicle Type</span>
                         </div>
                         <div className="grid grid-cols-4 gap-4">
                            {[
                              { label: '载重 kg', field: 'max_kg', val: cfg.max_kg },
                              { label: '托盘位', field: 'slots', val: cfg.slots },
                              { label: '起步价', field: 'cost_base', val: cfg.cost_base },
                              { label: '公里价', field: 'cost_km', val: cfg.cost_km }
                            ].map(item => (
                              <div key={item.field} className="space-y-1.5">
                                <label className="text-[9px] text-slate-600 font-bold uppercase block truncate">{item.label}</label>
                                <input 
                                  type="number" 
                                  value={item.val} 
                                  onChange={(e) => updateVehicle(name, item.field as keyof FleetConfigItem, e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[10px] font-mono text-blue-400 outline-none" 
                                />
                              </div>
                            ))}
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-[28px] border-slate-800 shadow-xl overflow-hidden">
          <button onClick={() => toggleSection('cache')} className={`w-full px-8 py-6 flex items-center justify-between transition-all ${activeSection === 'cache' ? 'bg-blue-600/5' : 'hover:bg-slate-800/40'}`}>
            <div className="flex items-center gap-5">
              <div className={`p-3 rounded-2xl transition-all duration-500 ${activeSection === 'cache' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4m0 5c0 2.21-3.58 4-8 4s-8-1.79-8-4"/></svg>
              </div>
              <div className="text-left">
                <span className="block font-black text-sm text-slate-100 uppercase tracking-widest leading-none">LBS 路由缓存管理</span>
                <span className="text-[10px] text-slate-500 font-mono mt-1.5">{cacheCount} CACHED GEONODES</span>
              </div>
            </div>
            <svg className={`w-5 h-5 text-slate-600 transition-transform duration-500 ${activeSection === 'cache' ? 'rotate-180 text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
          </button>
          
          {activeSection === 'cache' && (
            <div className="px-8 pb-8 pt-2 animate-in fade-in slide-in-from-top-2 duration-500">
               <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-3xl flex items-center justify-between gap-6">
                  <div className="flex-1">
                     <p className="text-xs text-slate-400 leading-relaxed">系统已将过往调度的地址坐标存入本地，并记录了 24 小时效期。下次遇到相同地址将跳过 API 请求，极速响应并节省配额。</p>
                  </div>
                  <button onClick={clearCache} className="px-6 py-3 bg-red-600/10 border border-red-500/30 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all whitespace-nowrap">清空缓存</button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;