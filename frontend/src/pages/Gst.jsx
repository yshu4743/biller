import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';
import { Card, Select, Input, Button, Spinner, EmptyState } from '../components/ui.jsx';
import { formatCurrency } from '../utils/format.js';

const defaultFrom = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const today = () => new Date().toISOString().slice(0, 10);

const Gst = () => {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [rateData, setRateData] = useState(null);

  const load = async () => {
    setLoading(true);
    const params = { from, to };
    const [g, r] = await Promise.all([api.get('/reports/gstr1', { params }), api.get('/reports/gst', { params })]);
    setData(g.data);
    setRateData(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const bucketRows = data ? [
    { key: 'B2B (Registered)', b: data.buckets.b2b },
    { key: 'B2C Small (< ₹2.5L)', b: data.buckets.b2cSmall },
    { key: 'B2C Large (≥ ₹2.5L)', b: data.buckets.b2cLarge },
    { key: 'Exports / SEZ', b: data.buckets.exports },
  ] : [];
  const total = data?.total;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">GST Returns (GSTR-1)</h2>
        <p className="text-sm text-gray-500">Outward supply summary, taxes and e-Invoice / e-Way bill compliance</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">From</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
            <span className="text-sm text-gray-600">To</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
          </div>
          <Button onClick={load}>Apply</Button>
        </div>
      </Card>

      {loading ? (
        <Spinner />
      ) : !data || data.total.count === 0 ? (
        <Card className="p-8"><EmptyState message="No sale invoices in this period" /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Taxable Value', value: total?.taxable, color: 'text-indigo-600' },
              { label: 'CGST', value: total?.cgst, color: 'text-emerald-600' },
              { label: 'SGST', value: total?.sgst, color: 'text-amber-600' },
              { label: 'IGST', value: total?.igst, color: 'text-rose-600' },
              { label: 'Total GST', value: total?.totalTax, color: 'text-gray-800' },
            ].map((c) => (
              <Card key={c.label} className="p-4">
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className={`text-lg font-bold ${c.color}`}>₹ {formatCurrency(c.value)}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="p-5 overflow-x-auto">
              <h3 className="font-semibold text-gray-800 mb-3">Outward Supplies</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 font-medium">Type</th>
                    <th className="py-2 text-right font-medium">Docs</th>
                    <th className="py-2 text-right font-medium">Taxable</th>
                    <th className="py-2 text-right font-medium">GST</th>
                  </tr>
                </thead>
                <tbody>
                  {bucketRows.map((r) => (
                    <tr key={r.key} className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">{r.key}</td>
                      <td className="py-2 text-right text-gray-500">{r.b.count}</td>
                      <td className="py-2 text-right font-medium">₹ {formatCurrency(r.b.taxable)}</td>
                      <td className="py-2 text-right text-gray-600">₹ {formatCurrency(r.b.cgst + r.b.sgst + r.b.igst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-gray-800 mb-3">GST by Rate</h3>
              <div className="space-y-2">
                {rateData?.summary.map((r) => (
                  <div key={r.rate} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                    <span className="text-gray-700 font-medium">{r.rate}% ({r.count} lines)</span>
                    <span className="text-gray-600">₹ {formatCurrency(r.taxable)}</span>
                    <span className="text-emerald-600">₹ {formatCurrency(r.cgst + r.sgst + r.igst)}</span>
                  </div>
                ))}
                {rateData?.summary.length === 0 && <p className="text-sm text-gray-400">No taxable lines</p>}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Compliance Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">e-Invoices generated</p>
                <p className="text-lg font-bold text-gray-800">{data.compliance.einvoiceCount} / {total.count}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">E-Way bills generated</p>
                <p className="text-lg font-bold text-gray-800">{data.compliance.ewayBillGenerated}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">E-Way bills required (&gt; ₹50,000)</p>
                <p className="text-lg font-bold text-amber-600">{data.compliance.ewayBillRequired} open</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Total invoices</p>
                <p className="text-lg font-bold text-gray-800">{total.count}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">e-Invoice and E-Way bill can be generated from the Invoices page. E-Way bill is mandatory for consignment value above ₹50,000 unless exempted.</p>
          </Card>
        </>
      )}
    </div>
  );
};

export default Gst;