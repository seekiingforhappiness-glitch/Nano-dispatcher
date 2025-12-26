import React, { useEffect, useState, useRef } from 'react';
import { DispatchStep } from '../types';

interface ProgressMonitorProps {
  step: DispatchStep;
  progress: number;
}

const ProgressMonitor: React.FC<ProgressMonitorProps> = ({ step, progress }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // 模拟底层算法执行日志，增强“详细展示”感
  useEffect(() => {
    const newLog = `[${new Date().toLocaleTimeString()}] 系统消息: 正在执行 [${step}] ...`;
    setLogs(prev => [...prev.slice(-8), newLog]);
  }, [step]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="p-6 overflow-hidden relative">
      {/* 顶部流光进度条 */}
      <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
        <div 
          className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(34,211,238,0.5)]" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,1)]"></div>
             <h3 className="text-sm font-black text-white tracking-tight italic">AI 计算中...</h3>
          </div>
          <p className="text-slate-500 text-[10px] font-medium font-mono pl-4">
             {step}
          </p>
        </div>
        <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 shadow-inner">
          <span className="text-xl font-black text-cyan-400 font-mono tracking-tighter">
            {Math.round(progress)}<span className="text-xs ml-0.5 opacity-60">%</span>
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* 左侧：可视化里程碑 (Compact Mode) */}
        <div className="space-y-2">
          {[
            { s: DispatchStep.VALIDATING, label: '需求建模', detail: 'Modeling' },
            { s: DispatchStep.GEOCODING, label: 'LBS 解析', detail: 'Geocoding' },
            { s: DispatchStep.ESTIMATING, label: '成本估算', detail: 'Costing' },
            { s: DispatchStep.OPTIMIZING, label: '路径优选', detail: 'Solving' }
          ].map((item, idx) => {
            const stepValues = [DispatchStep.VALIDATING, DispatchStep.GEOCODING, DispatchStep.ESTIMATING, DispatchStep.OPTIMIZING];
            const currentIdx = stepValues.indexOf(step);
            const isDone = currentIdx > idx || progress === 100;
            const isCurrent = step === item.s;
            
            return (
              <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-500 ${isCurrent ? 'bg-blue-600/10 border border-blue-500/20' : 'bg-slate-900/30 border border-transparent'}`}>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black transition-all duration-500 ${
                  isDone ? 'bg-emerald-500 text-slate-950' : 
                  isCurrent ? 'bg-blue-600 text-white animate-bounce' : 'bg-slate-800 text-slate-500'
                }`}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <div className={`text-xs font-bold transition-colors ${isDone ? 'text-emerald-400' : isCurrent ? 'text-blue-400' : 'text-slate-600'}`}>
                    {item.label}
                  </div>
                  {isCurrent && (
                    <div className="flex gap-0.5">
                      {[1,2,3].map(i => <div key={i} className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: `${i*0.2}s` }}></div>)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 右侧：实时算法日志终端 (Compact Mode) */}
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-[9px] h-[120px] flex flex-col relative group">
           <div className="flex items-center justify-between mb-2 border-b border-slate-900 pb-1">
              <span className="text-slate-600 font-black uppercase text-[8px] tracking-widest flex items-center gap-1.5">
                 <span className="w-1 h-1 rounded-full bg-emerald-500/50"></span>
                 Solver Log
              </span>
           </div>
           <div ref={logContainerRef} className="flex-1 overflow-y-auto space-y-1 no-scrollbar scroll-smooth">
              {logs.map((log, i) => (
                <div key={i} className="text-slate-500 flex gap-1 leading-tight">
                  <span className="text-blue-900 flex-none">{i+1024}</span>
                  <span className={`truncate ${i === logs.length - 1 ? 'text-cyan-400' : ''}`}>{log.split('系统消息:')[1] || log}</span>
                </div>
              ))}
              <div className="text-cyan-400/30 animate-pulse">_</div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressMonitor;