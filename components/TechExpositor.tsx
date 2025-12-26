
import React from 'react';

const TechExpositor: React.FC = () => {
  return (
    <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 头部：算法中心概述 */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <h2 className="text-4xl font-black text-white tracking-tight">智联运筹：算法白皮书</h2>
        <p className="text-slate-500 text-lg leading-relaxed">
          深入解析「纳米智能排线助手」背后的运筹优化逻辑。我们结合了计算几何与离散优化算法，致力于解决华东区域复杂的“一仓多点”调度挑战。
        </p>
      </section>

      {/* 算法 01: 极坐标聚类 */}
      <div className="glass-panel p-10 rounded-[40px] border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest">
            Phase 01: Clustering
          </div>
          <h3 className="text-3xl font-black text-white">极坐标扫描聚类 (Polar Sweep)</h3>
          <p className="text-slate-400 leading-relaxed">
            {/* Fix: Wrapped LaTeX-style math in string literals to prevent TypeScript parsing errors with $ and backslashes */}
            相比传统的 K-Means，极坐标扫描更适合物流排线。它以仓库为圆心 {"$\\text{O}(x_0, y_0)$"}，计算每个送货点的方位角 {"$\\theta = \\operatorname{atan2}(y-y_0, x-x_0)$"}。
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 font-mono text-xs">1</div>
              <p className="text-sm text-slate-500"><strong className="text-slate-300">防回头路：</strong> 算法沿角度射线顺时针扫描，确保同一车次的点位在空间上是集约且连续的。</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 font-mono text-xs">2</div>
              <p className="text-sm text-slate-500"><strong className="text-slate-300">角度扇区：</strong> 自动划分“扇区”，解决跨区域穿插导致的空驶浪费。</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 relative aspect-square flex items-center justify-center overflow-hidden">
           <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%"><defs><pattern id="p-grid" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" /></pattern></defs><rect width="100%" height="100%" fill="url(#p-grid)" /></svg>
           </div>
           {/* 可视化示意图：雷达扫描 */}
           <div className="relative w-64 h-64">
              <div className="absolute inset-0 border border-blue-500/20 rounded-full"></div>
              <div className="absolute inset-0 border border-blue-500/10 rounded-full scale-75"></div>
              <div className="absolute inset-0 border border-blue-500/5 rounded-full scale-50"></div>
              <div className="absolute top-1/2 left-1/2 w-32 h-[2px] bg-gradient-to-r from-blue-500 to-transparent origin-left animate-[spin_4s_linear_infinite]"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-sm shadow-[0_0_15px_rgba(37,99,235,0.6)]"></div>
              {[...Array(12)].map((_, i) => (
                <div key={i} className={`absolute w-2 h-2 rounded-full ${i < 4 ? 'bg-blue-400' : 'bg-slate-700'}`} style={{ 
                  top: `${50 + 40 * Math.sin(i * 0.52)}%`, 
                  left: `${50 + 40 * Math.cos(i * 0.52)}%` 
                }}></div>
              ))}
           </div>
        </div>
      </div>

      {/* 算法 02: 容量硬约束 */}
      <div className="glass-panel p-10 rounded-[40px] border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="order-2 lg:order-1 bg-slate-950 p-6 rounded-3xl border border-slate-800 font-mono text-[11px] text-blue-400/80 leading-relaxed">
           <div className="text-slate-600 mb-2">// Algorithm: 2D-Greedy Packing</div>
           <div className="space-y-1">
              <div>FOR each order in sorted_queue:</div>
              <div className="pl-4">IF (current_weight + order.kg &gt; vehicle.max_kg) OR</div>
              <div className="pl-4 text-emerald-500">   (current_slots + order.pallets &gt; vehicle.slots):</div>
              <div className="pl-8 text-amber-500">START_NEW_TRIP()</div>
              <div className="pl-4">ELSE:</div>
              <div className="pl-8">ADD_TO_CURRENT_TRIP()</div>
              <div className="pl-8 text-blue-400">UPDATE_VEHICLE_LOADS()</div>
           </div>
        </div>
        <div className="order-1 lg:order-2 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest">
            Phase 02: Constraints
          </div>
          <h3 className="text-3xl font-black text-white">二维贪心装箱 (2D-Greedy)</h3>
          <p className="text-slate-400 leading-relaxed">
            针对塑料粒子货物的特性，算法不仅仅考虑重量，更同步校验托盘位（Slots）。这是一个简化版的装箱问题（Bin Packing），确保单车配载既不超重也不爆仓。
          </p>
          <div className="flex gap-4">
            <div className="flex-1 p-4 rounded-2xl bg-slate-900 border border-slate-800">
               <div className="text-xs font-black text-slate-500 uppercase mb-1">重量上限</div>
               <div className="text-xl font-bold text-white">Max KG</div>
            </div>
            <div className="flex-1 p-4 rounded-2xl bg-slate-900 border border-slate-800">
               <div className="text-xs font-black text-slate-500 uppercase mb-1">托盘上限</div>
               <div className="text-xl font-bold text-white">Max Pallets</div>
            </div>
          </div>
        </div>
      </div>

      {/* 算法 03: 路线优化 */}
      <div className="glass-panel p-10 rounded-[40px] border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-600/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-widest">
            Phase 03: Sequence
          </div>
          <h3 className="text-3xl font-black text-white">最近邻路径优化 (Nearest Neighbor)</h3>
          <p className="text-slate-400 leading-relaxed">
            在车次内部，我们通过 NN 算法重新对订单进行排序。从仓库出发，每一步都寻找离当前位置最近的下一个目的地，最后返回仓库。
          </p>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
             <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase mb-2">
                <span>时效预测模型 (Rolling ETA)</span>
                <span className="text-blue-500">Real-time</span>
             </div>
             <p className="text-xs text-slate-500 italic">
               {/* Fix: Wrapped math formula in string literal to prevent "Cannot find name 'i'" and other parsing errors */}
               {"$ETA_n = ETD + \\sum_{i=1}^n (\\frac{Dist_{i-1,i}}{AvgSpeed} + ServiceTime)$"}
             </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
           {[
             { label: '平均时速', val: '45-60km/h', desc: '根据苏沪路况动态调节' },
             { label: '服务窗口', val: '25 min/站', desc: '预留卸货与签收时间' },
             { label: '绕路系数', val: '1.25', desc: '直线距离到真实路网转换' },
             { label: '返回闭环', val: 'Cycle-Back', desc: '自动计算回程里程与成本' },
           ].map((item, idx) => (
             <div key={idx} className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <div className="text-[10px] font-black text-amber-500 uppercase mb-1">{item.label}</div>
                <div className="text-lg font-bold text-white mb-1">{item.val}</div>
                <div className="text-[9px] text-slate-600">{item.desc}</div>
             </div>
           ))}
        </div>
      </div>

      {/* 算法 04: 成本选车 */}
      <div className="glass-panel p-12 rounded-[40px] bg-gradient-to-br from-blue-600/10 to-emerald-600/10 border-blue-500/20 text-center space-y-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <h3 className="text-3xl font-black text-white">经济选车模型 (Cost-Optimal Fleet)</h3>
          <p className="text-slate-400">
            {/* Fix: Wrapped cost formula in string literal to prevent "Cannot find name 'BaseCost'" and other parsing errors */}
            调度算法不仅是为了把货运走，更是为了“最便宜地”运走。系统会在每笔车次生成后，遍历车型库，寻找 {"$\\text{BaseCost} + \\text{Distance} \\times \\text{Rate}$"} 结果最小的车型。
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
           <div className="px-8 py-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
              <div className="text-xs font-black text-slate-600 uppercase mb-1">目标函数</div>
              {/* Fix: Wrapped objective function in string literal to prevent parsing errors */}
              <div className="text-xl font-black text-blue-400">{"$\\min(\\sum TripCost)$"}</div>
           </div>
           <div className="px-8 py-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
              <div className="text-xs font-black text-slate-600 uppercase mb-1">优化重点</div>
              <div className="text-xl font-black text-emerald-400">单公斤分摊成本</div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TechExpositor;
