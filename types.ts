
export interface Order {
  orderNo: string;
  deliveryDate: string;
  receiver: string;
  address: string;
  weightKg: number;
  pallets: number;
  remarks: string;
  spec?: string; // 规格，如 25kg/包
  deadline?: string;
  requirements?: string[];
  lat?: number;
  lng?: number;
  angle?: number;
  isGeoFault?: boolean;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface FileHistoryItem {
  id: string;
  name: string;
  sizeBytes: number;
  timestamp: number;
  data: Order[];
}

export interface Depot {
  id: string;
  name: string;
  address: string;
  lng: number;
  lat: number;
}

export enum MapProvider {
  AMAP = 'AMAP',
  GOOGLE = 'GOOGLE',
  OFFLINE = 'OFFLINE'
}

export enum DispatchMode {
  SINGLE_TO_MULTI = 'SINGLE_TO_MULTI',
  MULTI_TO_MULTI = 'MULTI_TO_MULTI',
}

export interface Vehicle {
  id: string;
  type: string;
  capacityKg: number;
  capacityPallets: number;
  baseCost: number;
  costPerKm: number;
  tags: string[];
}

export interface FleetConfigItem {
  max_kg: number;
  slots: number;
  cost_base: number;
  cost_km: number;
}

export interface Trip {
  id: string;
  vehicle: Vehicle;
  orders: Order[];
  totalWeight: number;
  totalPallets: number;
  totalDistance: number;
  totalDuration: number;
  estimatedCost: number;
  stops: Stop[];
  depot?: Depot;
  isSimulated?: boolean; // 标记是否为离线估算路径
}

export interface Stop {
  seq: number;
  orderNo: string;
  address: string;
  eta: string;
  distanceFromPrev: number;
}

export interface DispatchSummary {
  totalOrders: number;
  totalTrips: number;
  fleetMix: Record<string, number>;
  totalDistance: number;
  totalCost: number;
  avgLoadingRate: number;
  riskOrders: string[];
}

export enum DispatchStep {
  IDLE = 'IDLE',
  VALIDATING = '校验表格数据',
  GEOCODING = '解析地址坐标',
  ESTIMATING = '预估里程与成本',
  OPTIMIZING = '排线选车优化',
  COMPLETED = '生成结果文件',
}

// System Monitor Types
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'API' | 'ALGO';

export interface SystemLog {
  id: string;
  timestamp: number;
  level: LogLevel;
  module: string; // e.g., 'GEOCODER', 'CORE', 'UI'
  message: string;
  details?: any; // JSON stringifiable object
  costMs?: number; // Time taken for operation
}

export interface SystemMetrics {
  startTime: number;
  apiCalls: number;
  cacheHits: number;
  errors: number;
  activeModules: string[];
}