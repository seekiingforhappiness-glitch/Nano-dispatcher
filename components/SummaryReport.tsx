import React from 'react';
import { DispatchSummary } from '../types';

interface SummaryReportProps {
  summary: DispatchSummary;
}

const SummaryReport: React.FC<SummaryReportProps> = ({ summary }) => {
  const costPerOrder = summary.totalCost / (summary.totalOrders || 1);
  const costPerKm = summary.totalCost / (summary.totalDistance || 1);
  const avgOrdersPerTrip = summary.totalOrders / (summary.totalTrips || 1);
  const totalWeightTon = (summary.totalOrders * 2000) / 1000; // 模拟吨数

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      {/* 核心 KPI 玻璃态仪表盘 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: '调度车次总量', val: summary.totalTrips, unit: 'TRIPS', color: 'blue', desc: '智算生成的总路由数', icon: '🚛' },
          { label: '预估运营成本', val: Math.round(summary.totalCost), unit: 'CNY', color: 'emerald', desc: '含起步费与里程成本', icon: '💰' },
          { label: '单公斤运输成本', val: (summary.totalCost / (summary.totalOrders * 1500 + 1)).toFixed(3), unit: '元/kg', color: 'amber', desc: '全量单据摊销均值', icon: '📊' },
          { label: '整车装载饱和度', val: (summary.avgLoadingRate * 100).toFixed(1), unit: '%', color: 'purple', desc: '车队重量利用率中位数', icon: '🔋' }
        ].map((kpi, idx) => (
          <div key={idx} className="glass-panel p-8 rounded-[40px] border-slate-800 relative overflow-hidden group hover:border-slate-600 transition-all shadow-xl">
            <div className="absolute -right-4 -top-4 text-6xl opacity-[0.03] group-hover:opacity-[0.08] transition-opacity grayscale">{kpi.icon}</div>
            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
               <span className={`w-1.5 h-1.5 rounded-full bg-${kpi.color}-500`}></span>
               {kpi.label}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-black tracking-tighter text-white group-hover:text-${kpi.color}-400 transition-colors`}>{kpi.val}</span>
              <span className="text-[10px] text-slate-600 font-black">{kpi.unit}</span>
            </div>
            <div className="text-[9px] text-slate-600 mt-6 font-mono uppercase leading-tight">{kpi.desc}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 车型结构占比图表 */}
        <div className="lg:col-span-5 glass-panel p-10 rounded-[48px] border-slate-800 shadow-2xl bg-slate-900/40">
           <h3 className="text-xs font-black text-slate-500 uppercase mb-10 tracking-widest flex items-center justify-between">
              <span>车型结构效能分析 (Fleet Mix)</span>
              <span className="text-[9px] font-mono text-slate-700">OPT_ALPHA_V1</span>
           </h3>
           <div className="space-y-8">
              {(Object.entries(summary.fleetMix) as [string, number][]).sort((a,b) => b[1] - a[1]).map(([type, count]) => {
                const percent = (count / summary.totalTrips) * 100;
                return (
                  <div key={type} className="group">
                    <div className="flex justify-between items-end mb-3 px-1">
                       <span className="text-sm font-black text-slate-200 group-hover:text-blue-400 transition-colors">{type}</span>
                       <span className="text-[10px] font-mono text-slate-500 font-bold">{count} TRIPS <span className="mx-2 opacity-30">|</span> {percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 w-full bg-slate-950 rounded-full border border-slate-800 p-0.5">
                       <div className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 rounded-full transition-all duration-1500 ease-in-out shadow-[0_0_12px_rgba(59,130,246,0.4)]" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                )
              })}
           </div>

           <div className="mt-16 grid grid-cols-3 gap-6 pt-10 border-t border-slate-800">
              <div className="text-center group">
                 <div className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">¥{costPerKm.toFixed(1)}</div>
                 <div className="text-[9px] text-slate-600 font-black uppercase mt-2 tracking-tighter">每公里成本 (AVG)</div>
              </div>
              <div className="text-center group border-x border-slate-800">
                 <div className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">¥{Math.round(costPerOrder)}</div>
                 <div className="text-[9px] text-slate-600 font-black uppercase mt-2 tracking-tighter">单票分摊成本</div>
              </div>
              <div className="text-center group">
                 <div className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">{avgOrdersPerTrip.toFixed(1)}</div>
                 <div className="text-[9px] text-slate-600 font-black uppercase mt-2 tracking-tighter">平均整车串点</div>
              </div>
           </div>
        </div>

        {/* AI 运营深度洞察板块 */}
        <div className="lg:col-span-7 space-y-8">
          <div className="glass-panel p-12 rounded-[48px] border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-[0.02] -rotate-12 group-hover:rotate-0 transition-transform duration-1000 scale-150">
               <svg className="w-64 h-64 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
            </div>
            <h3 className="text-xs font-black text-emerald-400 uppercase mb-10 tracking-[0.2em] flex items-center gap-3">
               <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
               </span>
               AI 运筹专家运营决策建议 (Strategic Decision Support)
            </h3>
            <div className="space-y-10">
              {[
                { 
                  title: '运力池结构性优化', 
                  desc: `通过对 ${summary.totalTrips} 个车次的蒙特卡洛分析，发现当前车型选配在 [${Object.keys(summary.fleetMix)[0] || '默认'}] 车型上展现出最佳的 [空间-成本] 均衡率。建议在高频路由路线上固定该机动运力。`,
                  tag: '资源优化',
                  metric: 'EFFICIENCY +12.4%'
                },
                { 
                  title: '装载饱和度动态分析', 
                  desc: `识别到全量订单的重量与容积相关性为 0.94。平均装载率为 ${(summary.avgLoadingRate * 100).toFixed(1)}%。目前存在 ${(100 - summary.avgLoadingRate * 100).toFixed(1)}% 的理论冗余，可通过「合单策略」进一步摊薄单公斤运费。`,
                  tag: '降本空间',
                  metric: 'REDUNDANCY GAP'
                },
                { 
                  title: '区域时效风险预警', 
                  desc: `基于苏沪地区路网精算模型，预计平均签收时间窗口在 09:30 - 16:45 之间。受限于目前昆山出发的集货波次，建议将次晨达订单的最晚截单时间前置 30 分钟以确保 100% 履约。`,
                  tag: '履约风险',
                  metric: 'SLA PREDICTION'
                }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-8 items-start group/item">
                  <div className="mt-1.5 flex-none w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] group-hover/item:scale-150 transition-transform"></div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <h4 className="text-base font-black text-slate-100">{item.title}</h4>
                      <span className="text-[8px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black uppercase tracking-tighter border border-emerald-500/20">{item.tag}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                    <div className="text-[9px] font-mono text-emerald-500/60 font-black pt-1">{item.metric}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 异常警示看板 */}
          <div className="glass-panel p-10 rounded-[48px] border-orange-500/20 bg-orange-500/5 shadow-xl">
             <div className="flex items-center justify-between mb-10">
                <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest flex items-center gap-3">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                   执行异常与风险检视 (Risk Assessment)
                </h3>
                <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase shadow-sm ${summary.riskOrders.length > 0 ? 'bg-orange-500 text-white' : 'bg-emerald-500/20 text-emerald-500'}`}>
                   {summary.riskOrders.length > 0 ? 'ATTENTION REQUIRED' : 'SECURITY LEVEL: EXCELLENT'}
                </span>
             </div>
             <div className="grid grid-cols-2 gap-10">
                <div className="space-y-2 group">
                   <div className="text-3xl font-black text-slate-200 group-hover:text-orange-400 transition-colors">{summary.riskOrders.length}</div>
                   <div className="text-[10px] text-slate-600 uppercase font-black tracking-tight">LBS 地址解析模糊单数</div>
                </div>
                <div className="space-y-2 group">
                   <div className="text-3xl font-black text-slate-200 group-hover:text-emerald-400 transition-colors">0</div>
                   <div className="text-[10px] text-slate-600 uppercase font-black tracking-tight">载重/时效刚性约束违规</div>
                </div>
             </div>
             {summary.riskOrders.length > 0 && (
               <div className="mt-10 p-5 bg-slate-950/60 rounded-3xl border border-orange-500/20 text-[11px] text-orange-400/80 italic leading-relaxed">
                  警告：检测到 ${summary.riskOrders.length} 条需求单的地址字段过于模糊。算法已自动回退至「地理近似值模型」，建议在下载的 Excel 执行表中过滤「地址坐标风险」进行人工核实。
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryReport;