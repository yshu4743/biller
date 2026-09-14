import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import api from '../api/axios.js';
import { encodeEan13 } from '../utils/barcode.js';
import { formatCurrency } from '../utils/format.js';
import { Spinner, Button } from '../components/ui.jsx';

const BarcodeSvg = ({ code, height = 40 }) => {
  const bits = encodeEan13(code);
  const width = bits.length * 1;
  let bars = [];
  let barStart = -1;
  for (let i = 0; i <= bits.length; i++) {
    if (i < bits.length && bits[i] === '1') {
      if (barStart === -1) barStart = i;
    } else if (barStart !== -1) {
      bars.push({ x: barStart, w: i - barStart });
      barStart = -1;
    }
  }
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxHeight: height, height }}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#000" />)}
    </svg>
  );
};

const Label = ({ item }) => (
  <div className="border border-gray-300 rounded p-3 text-center" style={{ width: '218px', minHeight: '128px' }}>
    <p className="text-xs font-semibold text-gray-800 leading-tight mb-1 line-clamp-2">{item.name}</p>
    {item.salePrice > 0 && <p className="text-[10px] text-gray-500 mb-1">MRP: ₹ {formatCurrency(item.mrp || item.salePrice)}</p>}
    {item.barcode ? <BarcodeSvg code={item.barcode} height={40} /> : <p className="text-xs text-gray-400">No barcode</p>}
    <p className="text-[10px] tracking-widest text-gray-700 mt-1">{item.barcode}</p>
  </div>
);

const BarcodeLabels = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);

  const ids = (params.get('ids') || '').split(',').filter(Boolean);

  useEffect(() => {
    const load = async () => {
      const params2 = {};
      if (ids.length > 0) params2.ids = ids.join(',');
      const res = await api.get('/items', { params: params2 });
      const all = res.data;
      const exact = ids.length > 0 ? all.filter((i) => ids.includes(i._id)) : all;
      setItems(exact);
    };
    load();
  }, [params]);

  if (!items) return <Spinner />;

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-4">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{items.length} label(s)</span>
          <Button onClick={() => window.print()}><Printer size={16} className="mr-1" /> Print Labels</Button>
        </div>
      </div>
      <div id="print-area" className="max-w-[820px] mx-auto flex flex-wrap gap-3 justify-center">
        {items.map((item) => <Label key={item._id} item={item} />)}
      </div>
    </div>
  );
};

export default BarcodeLabels;