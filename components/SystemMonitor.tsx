import React, { useState, useEffect, useRef } from 'react';
import { SystemLog, SystemMetrics, LogLevel } from '../types';
import * as XLSX from 'xlsx';

interface SystemMonitorProps {
  logs: SystemLog[];
  metrics: SystemMetrics;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

const SystemMonitor: React.FC<SystemMonitorProps> = ({ logs, metrics, isOpen, setIsOpen }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const exportReport = () => {
    // 1. Log Sheet
    const logData = logs.map(l => ({
      Timestamp: new Date(l.timestamp).toISOString(),
      Level: l.level,
      Module: l.module,
      Message: l.message,
      Cost_MS: l.costMs || '',
      Details: l.details ? JSON.stringify(l.details) : ''
    }));

    // 2. Summary Sheet
    const summaryData = [{
      'Report Generation Time': new Date().toLocaleString(),
      'Total API Calls': metrics.apiCalls,
      'Cache Hit Rate': metrics.apiCalls > 0 ? `${((metrics.cacheHits / metrics.apiCalls) * 100).toFixed(1)}%` : 'N/A',
      'Total Errors': metrics.errors,
      'Active Modules': metrics.activeModules.join(', '),
      'Tech Stack': 'React 19, TypeScript, Amap Web Service API, 2D-Bin Packing Algo, Polar Sweep Clustering'
    }];

    const wb = XLSX.utils.book_new();
    const wsLogs = XLSX.utils.json_to_sheet(logData);
    const wsSum = XLSX.utils.json_to_sheet(summaryData);

    XLSX.utils.book_append_sheet(wb, wsSum, "System_Overview");
    XLSX.utils.book_append_sheet(wb, wsLogs, "Execution_Trace_Logs");

    XLSX.writeFile(wb, `Internal_Trace_Report_${Date.now()}.xlsx`);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center shadow-2xl hover:bg-slate-800 hover:scale-110 transition-all group"
        title="Open System Monitor"
      >
        <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
        {metrics.errors > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-black border border-slate-900">
            {metrics.errors}
          </span>
        )}
      </button>
    );
  }

  const getLevelColor = (level: LogLevel) => {
    switch(level) {
      case 'INFO': return 'text-slate-400';
      case 'WARN': return 'text-amber-400';
      case 'ERROR': return 'text-red-500 font-bold';
      case 'API': return 'text-blue-400';
      case 'ALGO': return 'text-emerald-400';
      default: return 'text-slate-400';
    }
  };

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.level === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 lg:p-12">
      <div className="w-full max-w-5xl h-[80vh] bg-[#0c101a] border border-slate-800 rounded-[20px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">System Internal Monitor <span className="text-slate-600 ml-2">DEV_MODE</span></h2>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={exportReport} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-700">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export Trace Report
             </button>
             <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-4 border-b border-slate-800 h-24">
           {[
             { label: 'Runtime Status', val: metrics.errors > 0 ? 'UNSTABLE' : 'HEALTHY', color: metrics.errors > 0 ? 'text-red-500' : 'text-emerald-500', icon: '🟢' },
             { label: 'API Interactions', val: metrics.apiCalls, sub: `${metrics.cacheHits} cached`, color: 'text-blue-400' },
             { label: 'Exceptions', val: metrics.errors, color: metrics.errors > 0 ? 'text-red-500' : 'text-slate-400' },
             { label: 'Active Modules', val: metrics.activeModules.length, sub: 'React/Worker', color: 'text-purple-400' }
           ].map((m, i) => (
             <div key={i} className="flex flex-col justify-center px-6 border-r border-slate-800 last:border-0 bg-slate-900/20">
                <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">{m.label}</div>
                <div className={`text-xl font-mono font-black ${m.color}`}>{m.val}</div>
                {m.sub && <div className="text-[9px] text-slate-500 font-mono mt-0.5">{m.sub}</div>}
             </div>
           ))}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#0a0d14] border-b border-slate-800">
           {(['ALL', 'INFO', 'API', 'ALGO', 'WARN', 'ERROR'] as const).map(l => (
             <button 
               key={l} 
               onClick={() => setFilter(l)}
               className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all ${
                 filter === l ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800'
               }`}
             >
               {l}
             </button>
           ))}
           <div className="flex-1"></div>
           <label className="flex items-center gap-2 text-[9px] text-slate-500 cursor-pointer">
             <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="rounded bg-slate-800 border-slate-700" />
             AUTO-SCROLL
           </label>
        </div>

        {/* Log Console */}
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-[#05070a]"
        >
           {filteredLogs.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-2">
               <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
               <span>AWAITING SYSTEM EVENTS...</span>
             </div>
           )}
           {filteredLogs.map((log) => (
             <div key={log.id} className="flex gap-3 hover:bg-white/5 p-1 rounded transition-colors group">
               <span className="text-slate-600 w-20 shrink-0">{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}.{String(log.timestamp % 1000).padStart(3, '0')}</span>
               <span className={`w-12 shrink-0 font-bold ${getLevelColor(log.level)}`}>{log.level}</span>
               <span className="text-slate-500 w-24 shrink-0 truncate" title={log.module}>[{log.module}]</span>
               <div className="flex-1 text-slate-300 break-all">
                  <span className={log.level === 'ERROR' ? 'text-red-400' : ''}>{log.message}</span>
                  {log.costMs !== undefined && <span className="text-slate-600 ml-2">({log.costMs}ms)</span>}
                  {log.details && (
                    <pre className="mt-1 text-[10px] text-slate-500 bg-slate-900/50 p-2 rounded border border-slate-800/50 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
               </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;