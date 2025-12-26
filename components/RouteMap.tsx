
import React, { useMemo } from 'react';
import { Trip } from '../types';

export enum MapLayer {
  TECH = 'tech',
  SATELLITE = 'satellite',
  TRAFFIC = 'traffic'
}

interface RouteMapProps {
  selectedTrip: Trip | undefined;
  depot: { lat: number; lng: number; name: string };
  layer?: MapLayer;
  hoveredStopSeq?: number | null;
}

// Fixed: Completed component logic and added default export to resolve "no default export" error.
const RouteMap: React.FC<RouteMapProps> = ({ selectedTrip, depot, layer = MapLayer.TECH, hoveredStopSeq }) => {
  const { points, pathD, isRisk } = useMemo(() => {
    if (!selectedTrip) return { points: [], pathD: '', isRisk: false };
    
    // 构建有序点集：仓库 -> 站点1..N -> 仓库 (闭环)
    const rawPoints = [
      { lat: depot.lat, lng: depot.lng, name: depot.name, type: 'depot', seq: 0, orderNo: 'DEPOT', isGeoFault: false },
      ...selectedTrip.orders.map((o, idx) => ({ 
        lat: o.lat || 0, 
        lng: o.lng || 0, 
        name: o.receiver, 
        type: 'stop',
        seq: idx + 1,
        orderNo: o.orderNo,
        isGeoFault: o.isGeoFault
      })),
      { lat: depot.lat, lng: depot.lng, name: depot.name, type: 'depot', seq: selectedTrip.orders.length + 1, orderNo: 'RETURN', isGeoFault: false }
    ];

    // 计算坐标包围盒，用于归一化映射
    const lats = rawPoints.map(p => p.lat);
    const lngs = rawPoints.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.1;
    const lngRange = maxLng - minLng || 0.1;

    // 将经纬度映射到 100x100 的 SVG 画布（预留 15% 边距）
    const mappedPoints = rawPoints.map(p => ({
      ...p,
      x: 15 + ((p.lng - minLng) / lngRange) * 70,
      y: 85 - ((p.lat - minLat) / latRange) * 70, 
    }));

    const path = mappedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    // 检查该车次是否包含风险单
    const hasRisk = selectedTrip.orders.some(o => o.isGeoFault);

    return { points: mappedPoints, pathD: path, isRisk: hasRisk };
  }, [selectedTrip, depot]);

  if (!selectedTrip || points.length === 0) {
    return (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
        <div className="text-slate-700 font-mono text-xs flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
          正在智能推演配送路径模型...
        </div>
      </div>
    );
  }

  const getTheme = () => {
    switch(layer) {
      case MapLayer.SATELLITE: return { bg: '#020617', grid: 'rgba(255,255,255,0.02)', path: '#3b82f6', pulse: 'blue' };
      case MapLayer.TRAFFIC: return { bg: '#050a1f', grid: 'rgba(16,185,129,0.05)', path: '#10b981', pulse: 'emerald' };
      default: return { bg: '#0a0f1e', grid: 'rgba(59,130,246,0.08)', path: '#3b82f6', pulse: 'blue' };
    }
  };

  const theme = getTheme();

  return (
    <div className="w-full h-full relative group cursor-crosshair overflow-hidden transition-colors duration-700" style={{ backgroundColor: theme.bg }}>
      {/* 动态背景网格 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <pattern id="map-grid-enhanced" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={theme.grid} strokeWidth="0.5"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#map-grid-enhanced)" />
      </svg>

      <svg viewBox="0 0 100 100" className="w-full h-full transition-transform duration-700 group-hover:scale-[1.03]">
        <defs>
          <filter id="path-glow-pro">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <marker id="arrowhead" markerWidth="3" markerHeight="3" refX="1.5" refY="1.5" orient="auto">
            <polygon points="0 0, 3 1.5, 0 3" fill={theme.path} opacity="0.5" />
          </marker>
        </defs>

        {/* 基础路径投影 */}
        <path d={pathD} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(0.4, 0.4)" />

        {/* 主配送路径线 */}
        <path 
          d={pathD} 
          fill="none" 
          stroke={theme.path} 
          strokeWidth="0.8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          filter="url(#path-glow-pro)"
          className="path-draw-animation"
        />

        {/* 流向指示动效 */}
        <path 
          d={pathD} 
          fill="none" 
          stroke="white" 
          strokeWidth="0.4" 
          strokeOpacity="0.4"
          strokeDasharray="1, 8"
          className="path-flow-animation"
        />

        {/* 渲染所有节点 */}
        {points.map((p, idx) => {
          // 跳过返回仓库的虚点渲染，只渲染起始仓库和配送点
          if (p.orderNo === 'RETURN') return null;
          
          const isHovered = hoveredStopSeq === p.seq;
          const isFailedGeo = p.isGeoFault;

          return (
            <g key={idx} className="transition-all duration-300">
              {p.type === 'depot' ? (
                <g transform={`translate(${p.x}, ${p.y})`}>
                  <circle r="4" className="fill-blue-500/20 animate-ping" />
                  <path d="M-2 -2 L2 -2 L2 2 L-2 2 Z" className="fill-blue-500 stroke-blue-100 stroke-[0.3]" />
                  <text y="-6" textAnchor="middle" className="fill-blue-400 text-[2.8px] font-black uppercase tracking-widest">W-CENTER</text>
                </g>
              ) : (
                <g transform={`translate(${p.x}, ${p.y})`}>
                  {/* 高亮光晕 */}
                  {isHovered && <circle r="3.5" className="fill-white/10 animate-pulse" />}
                  
                  <circle 
                    r={isHovered ? "2" : "1.4"} 
                    className={`transition-all ${
                      isFailedGeo ? 'fill-orange-500' : isHovered ? 'fill-blue-400' : 'fill-slate-800'
                    } stroke-blue-500 stroke-[0.3]`} 
                  />
                  
                  {/* 站点序号 */}
                  <text 
                    y="0.6" 
                    textAnchor="middle" 
                    className={`text-[2px] font-black select-none ${isHovered ? 'fill-slate-950' : 'fill-white'}`}
                  >
                    {p.seq}
                  </text>
                  
                  {/* 悬停浮窗详情 */}
                  {isHovered && (
                    <g transform="translate(0, -7)">
                      <rect x="-12" y="-4" width="24" height="6" rx="1.5" className="fill-slate-950/90 stroke-slate-700 stroke-[0.3]" />
                      <text textAnchor="middle" className="fill-blue-400 text-[2.2px] font-black">
                        {p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name}
                      </text>
                      <text y="2" textAnchor="middle" className="fill-slate-500 text-[1.6px] font-mono">
                        {p.orderNo}
                      </text>
                    </g>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default RouteMap;
