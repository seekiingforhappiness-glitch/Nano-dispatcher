
import React, { useRef, useState } from 'react';
import { ICONS } from '../constants';
import { Order } from '../types';
import * as XLSX from 'xlsx';

interface UploadAreaProps {
  onUpload: (data: Order[]) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 金发科技业务特定的托盘计算逻辑
  const smartCalculatePallets = (weight: number, spec: string) => {
    const s = String(spec || "").toLowerCase();
    if (s.includes('1t') || s.includes('1000kg') || s.includes('大包')) return Math.ceil(weight / 1000) || 1;
    if (s.includes('25kg') || s.includes('小包')) return Math.ceil((weight / 25) / 40) || 1;
    return Math.ceil(weight / 1500) || 1;
  };

  const matches = (val: any, targets: string[]) => {
    const s = String(val || "").toLowerCase().trim();
    return targets.some(t => s.includes(t));
  };

  const isLikelyAddress = (val: any) => {
    const s = String(val || "").trim();
    // 宽松的地址判断逻辑：长度大于3且包含特定关键字，或者长度大于8且不全是数字
    if (s.length < 3) return false;
    const keywords = ['省', '市', '区', '县', '路', '街', '道', '号', '镇', '村', '大厦', '中心', '公司', '厂', '库', 'address', 'location'];
    if (keywords.some(k => s.includes(k))) return true;
    return s.length > 8 && !/^\d+$/.test(s);
  };

  const isLikelyWeight = (val: any) => {
     const s = String(val || "").trim().replace(/,/g, '');
     if (!s) return false;
     const num = parseFloat(s);
     return !isNaN(num) && num > 0 && num < 100000; // 假设单单重量不过100吨
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        // 防御性库获取
        const lib = (XLSX as any).default || XLSX;
        if (!lib || !lib.read) {
          throw new Error("Excel 解析引擎 (SheetJS) 加载失败，请刷新页面或检查网络。");
        }

        const workbook = lib.read(arrayBuffer, { type: 'array', cellDates: true });
        let finalOrders: Order[] = [];

        // 遍历所有 Sheet
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rows = lib.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
          
          if (rows.length < 1) continue;

          // 步骤 1: 尝试基于关键字定位表头
          let headerRowIndex = -1;
          const kAddr = ['地址', '卸点', '收货地', '目的地', '到站', 'location', 'address', '送货', 'addr', '交货'];
          const kWeight = ['重量', '数量', '毛重', '发货量', 'kg', 'qty', 'weight', '吨', 'wgt', 'vol', 'amount'];
          const kOrderNo = ['单号', '订单', 'no', 'shipment', 'id', 'key'];
          const kReceiver = ['收方', '客户', '单位', 'customer', 'receiver', 'to'];

          // 扫描前 20 行寻找表头
          for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = rows[i];
            let score = 0;
            row.forEach(cell => {
              const val = String(cell || "");
              if (matches(val, kAddr)) score += 10;
              if (matches(val, kWeight)) score += 5;
              if (matches(val, kOrderNo)) score += 2;
            });
            if (score >= 10) { headerRowIndex = i; break; }
          }

          let colMap = {
            address: -1,
            weight: -1,
            orderNo: -1,
            receiver: -1,
            spec: -1
          };

          // 如果找到了表头，尝试映射列
          if (headerRowIndex !== -1) {
             const headerRow = rows[headerRowIndex];
             colMap.address = headerRow.findIndex(c => matches(c, kAddr));
             colMap.weight = headerRow.findIndex(c => matches(c, kWeight));
             colMap.orderNo = headerRow.findIndex(c => matches(c, kOrderNo));
             colMap.receiver = headerRow.findIndex(c => matches(c, kReceiver));
             colMap.spec = headerRow.findIndex(c => matches(c, ['规格', 'spec', '包装']));
          }

          // 步骤 2: 智能内容回溯 (Fallback)
          // 如果地址列或重量列未找到，扫描数据行进行内容推断
          if (colMap.address === -1 || colMap.weight === -1) {
             const startRow = headerRowIndex === -1 ? 0 : headerRowIndex + 1;
             const sampleLimit = Math.min(rows.length, startRow + 20);
             const colScores: { [key: number]: { addr: number, wgt: number } } = {};

             for (let i = startRow; i < sampleLimit; i++) {
                rows[i].forEach((cell, idx) => {
                   if (!colScores[idx]) colScores[idx] = { addr: 0, wgt: 0 };
                   if (isLikelyAddress(cell)) colScores[idx].addr++;
                   if (isLikelyWeight(cell)) colScores[idx].wgt++;
                });
             }

             // 找出得分最高的列
             let bestAddrCol = -1, maxAddrScore = 0;
             let bestWgtCol = -1, maxWgtScore = 0;

             Object.entries(colScores).forEach(([colStr, scores]) => {
                const col = parseInt(colStr);
                if (scores.addr > maxAddrScore) { maxAddrScore = scores.addr; bestAddrCol = col; }
                if (scores.wgt > maxWgtScore) { maxWgtScore = scores.wgt; bestWgtCol = col; }
             });

             if (colMap.address === -1 && maxAddrScore > 0) colMap.address = bestAddrCol;
             if (colMap.weight === -1 && maxWgtScore > 0) colMap.weight = bestWgtCol;
          }

          // 如果仍然没有找到地址列，跳过此 Sheet
          if (colMap.address === -1) continue;

          // 提取数据
          const sheetOrders: Order[] = [];
          const startExtractRow = headerRowIndex === -1 ? 0 : headerRowIndex + 1;

          for (let i = startExtractRow; i < rows.length; i++) {
            const row = rows[i];
            // 越界保护
            if (!row) continue;
            
            const addr = String(row[colMap.address] || "").trim();
            // 地址过短视为无效行
            if (addr.length < 2) continue;

            let weight = 0;
            if (colMap.weight !== -1) {
               const weightStr = String(row[colMap.weight] || "0").replace(/[^\d.]/g, '');
               weight = parseFloat(weightStr);
            }
            
            // 默认值兜底
            if (isNaN(weight) || weight <= 0) weight = 1000; // 如果没解析出重量，默认为 1吨

            // 单位修正：如果表头包含'吨'，且数值小于 100，大概率是吨，转换为 kg
            let isTon = false;
            if (headerRowIndex !== -1) {
               const headerVal = String(rows[headerRowIndex][colMap.weight] || "");
               if (headerVal.includes('吨')) isTon = true;
            }
            if (isTon && weight < 200) weight *= 1000;

            const spec = String(colMap.spec !== -1 ? row[colMap.spec] : "");

            sheetOrders.push({
              orderNo: String(colMap.orderNo !== -1 ? row[colMap.orderNo] : `ORD-${Date.now()}-${i}`),
              deliveryDate: "",
              receiver: String(colMap.receiver !== -1 ? row[colMap.receiver] : "未命名客户"),
              address: addr,
              weightKg: weight,
              spec: spec,
              pallets: smartCalculatePallets(weight, spec),
              remarks: "",
            });
          }

          if (sheetOrders.length > 0) {
            finalOrders = sheetOrders;
            break; // 找到数据后停止处理其他 Sheet
          }
        }

        if (finalOrders.length === 0) {
          throw new Error("未能识别到有效数据。请确保 Excel 中包含可识别的地址列（如：地址、送货地）。");
        }

        onUpload(finalOrders);
      } catch (err) {
        console.error("Parser Error:", err);
        alert(`❌ 读取失败: ${(err as Error).message}`);
        setFileName(null);
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      alert("❌ 文件读取中断，请检查文件是否被占用。");
      setIsProcessing(false);
      setFileName(null);
    };

    // 使用 readAsArrayBuffer 替代 readAsBinaryString 以获得更好的兼容性
    reader.readAsArrayBuffer(file);
  };

  return (
    <div 
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      className={`glass-panel rounded-[32px] p-6 border-2 border-dashed transition-all cursor-pointer text-center group ${
        isProcessing ? 'opacity-50 cursor-wait' : 'border-slate-800 hover:border-blue-500/40 hover:bg-slate-900/50'
      }`}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls,.csv" />
      
      <div className="relative mb-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto transition-all duration-500 ${
          fileName ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500 group-hover:bg-blue-600/10'
        }`}>
          {isProcessing ? (
            <svg className="animate-spin h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : fileName ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
          ) : (
            <ICONS.FileUp />
          )}
        </div>
      </div>

      <h3 className="text-sm font-black text-slate-100">
        {isProcessing ? '正在解析...' : (fileName || '上传发货单')}
      </h3>
      <p className="text-[9px] text-slate-500 font-bold mt-1.5 uppercase tracking-widest leading-relaxed">
        {isProcessing ? '数据建模中...' : '.XLSX / .CSV'}
      </p>

      {fileName && !isProcessing && (
        <div className="mt-4 flex justify-center">
           <span className="text-[8px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full font-black uppercase tracking-tighter">
             Ready
           </span>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
