
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/30">
            N
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">纳米智能排线助手</h1>
            <p className="text-[10px] text-slate-500 font-mono mt-1">NANO-LOGISTICS DISPATCHER V3.2 PRO</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-slate-400">系统引擎：就绪</span>
          </div>
          <div className="text-xs text-slate-500 border-l border-slate-800 pl-6 hidden md:block">
            发货基地: 江苏昆山
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
