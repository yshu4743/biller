import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';
import { Card, Select, Input, Button, Spinner, EmptyState } from '../components/ui.jsx';
import { formatCurrency } from '../utils/format.js';

const defaultFrom = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const today = () => new Date().toISOString().slice(0, 10);

const downloadJson = (name, obj) => {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const fmt = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n) || 0);

const Money = ({ v }) => (
  <span className="tabular-nums font-medium">₹ {fmt(v)}</span>
);

const Gst = () => {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(today());
  const [tab, setTab] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [rateData, setRateData] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [g3b, setG3b] = useState(null);

  const loadSummary = async () => {
    const params = { from, to };
    const [g, r] = await Promise.all([api.get('/reports/gstr1', { params }), api.get('/reports/gst', { params })]);
    setData(g.data);
    setRateData(r.data);
  };

  const loadExport = async () => {
    const res = await api.get('/reports/gstr1/export', { params: { from, to } });
    setExportData(res.data);
  };

  const loadG3b = async () => {
    const res = await api.get('/reports/gstr3b', { params: { from, to } });
    setG3b(res.data);
  };

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'summary') await loadSummary();
      else if (tab === 'export') await loadExport();
      else await loadG3b();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load GST data');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t) => {
    setTab(t);
  };

  useEffect(() => {
    if (tab === 'summary') loadSummary();
    else if (tab === 'export') loadExport();
    else loadG3b();
    // eslint-disable-next-line
  }, [tab]);

  const bucketRows = data ? [
    { key: 'B2B (Registered)', b: data.buckets.b2b },
    { key: 'B2C Small (< ₹2.5L)', b: data.buckets.b2cSmall },
    { key: 'B2C Large (≥ ₹2.5L)', b: data.buckets.b2cLarge },
    { key: 'Exports / SEZ', b: data.buckets.exports },
  ] : [];
  const total = data?.total;
  const payload = exportData?.payload || {};
  const s3 = g3b?.sections?.s3_1 || {};
  const s4 = g3b?.sections?.s4 || {};

  const tabs = [
    { key: 'summary', label: 'GSTR-1 Summary' },
    { key: 'export', label: 'GSTR-1 Export' },
    { key: 'g3b', label: 'GSTR-3B Worksheet' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">GST Returns</h2>
        <p className="text-sm text-gray-500">GSTR-1 outward supply summary, export annexure and GSTR-3B worksheet</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">From</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
            <span className="text-sm text-gray-600">To</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
            <Button onClick={() => load()}>Apply</Button>
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                className={`px-3 py-2 font-medium transition-colors ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <Spinner />
      ) : tab === 'summary' ? (
        !data || data.total.count === 0 ? (
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
                        <td className="py-2 text-right font-medium"><Money v={r.b.taxable} /></td>
                        <td className="py-2 text-right text-gray-600"><Money v={r.b.cgst + r.b.sgst + r.b.igst} /></td>
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
                      <span className="text-gray-600"><Money v={r.taxable} /></span>
                      <span className="text-emerald-600"><Money v={r.cgst + r.sgst + r.igst} /></span>
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
        )
      ) : tab === 'export' ? (
        !exportData || exportData.counts.b2b + exportData.counts.b2cs + exportData.counts.exports === 0 ? (
          <Card className="p-8"><EmptyState message="No sale invoices in this period to export" /></Card>
        ) : (
          <>
            <Card className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">GSTR-1 Annexure Export (JSON)</h3>
                <p className="text-sm text-gray-500">
                  {fmt(exportData.counts.b2b)} B2B · {fmt(exportData.counts.b2cs)} B2C · {fmt(exportData.counts.exports)} exports · {fmt(exportData.counts.hsn)} HSN lines
                  {payload?.gstin ? <> · GSTIN {payload.gstin}</> : null}
                </p>
              </div>
              <Button onClick={() => downloadJson(`gstr1-${payload.fp || 'all'}.json`, payload)}>
                Download Annexure JSON
              </Button>
            </Card>

            {payload.b2b?.length > 0 && (
              <Card className="p-5 overflow-x-auto">
                <h3 className="font-semibold text-gray-800 mb-3">B2B — Registered buyers ({payload.b2b.length})</h3>
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 font-medium">GSTIN</th>
                      <th className="py-2 font-medium">Invoice</th>
                      <th className="py-2 font-medium">Date</th>
                      <th className="py-2 text-right font-medium">Taxable</th>
                      <th className="py-2 text-right font-medium">GST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.b2b.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 text-gray-800">{r.gstin}</td>
                        <td className="py-2 text-gray-600">{r.doc.no}</td>
                        <td className="py-2 text-gray-600">{r.doc.dt}</td>
                        <td className="py-2 text-right"><Money v={r.itms.reduce((s, it) => s + (it.itm_det?.txval || 0), 0)} /></td>
                        <td className="py-2 text-right"><Money v={r.itms.reduce((s, it) => s + (it.itm_det?.camt || 0) + (it.itm_det?.samt || 0) + (it.itm_det?.iamt || 0), 0)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            {payload.b2cs?.length > 0 && (
              <Card className="p-5 overflow-x-auto">
                <h3 className="font-semibold text-gray-800 mb-3">B2C — Unregistered buyers ({payload.b2cs.length})</h3>
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 font-medium">Type</th>
                      <th className="py-2 font-medium">POS</th>
                      <th className="py-2 font-medium">Invoice</th>
                      <th className="py-2 font-medium">Date</th>
                      <th className="py-2 text-right font-medium">Taxable</th>
                      <th className="py-2 text-right font-medium">GST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.b2cs.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2"><span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">{r.sply_ty}</span></td>
                        <td className="py-2 text-gray-600">{r.pos}</td>
                        <td className="py-2 text-gray-600">{r.doc.no}</td>
                        <td className="py-2 text-gray-600">{r.doc.dt}</td>
                        <td className="py-2 text-right"><Money v={r.itms.reduce((s, it) => s + (it.itm_det?.txval || 0), 0)} /></td>
                        <td className="py-2 text-right"><Money v={r.itms.reduce((s, it) => s + (it.itm_det?.camt || 0) + (it.itm_det?.samt || 0) + (it.itm_det?.iamt || 0), 0)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            {payload.hsnd?.length > 0 && (
              <Card className="p-5 overflow-x-auto">
                <h3 className="font-semibold text-gray-800 mb-3">HSN Summary</h3>
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 font-medium">HSN</th>
                      <th className="py-2 font-medium">UQC</th>
                      <th className="py-2 text-right font-medium">Qty</th>
                      <th className="py-2 text-right font-medium">Total Value</th>
                      <th className="py-2 text-right font-medium">Taxable</th>
                      <th className="py-2 text-right font-medium">CGST</th>
                      <th className="py-2 text-right font-medium">SGST</th>
                      <th className="py-2 text-right font-medium">IGST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.hsnd.map((h, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 text-gray-800 font-medium">{h.hsn_sc}</td>
                        <td className="py-2 text-gray-600">{h.uqc}</td>
                        <td className="py-2 text-right">{fmt(h.qty)}</td>
                        <td className="py-2 text-right"><Money v={h.val} /></td>
                        <td className="py-2 text-right"><Money v={h.txval} /></td>
                        <td className="py-2 text-right"><Money v={h.camt} /></td>
                        <td className="py-2 text-right"><Money v={h.samt} /></td>
                        <td className="py-2 text-right"><Money v={h.iamt} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </>
        )
      ) : (
        !g3b ? (
          <Card className="p-8"><EmptyState message="No data for this period" /></Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Invoices', value: fmt(g3b.totals.invoices), color: 'text-gray-800' },
                { label: 'Purchases', value: fmt(g3b.totals.purchases), color: 'text-gray-800' },
                { label: 'GST Payable (3.1net)', value: g3b.totals.outstandingGst, color: 'text-rose-600' },
                { label: 'Total ITC (Sec 4)', value: g3b.totals.totalItc, color: 'text-emerald-600' },
              ].map((c) => (
                <Card key={c.label} className="p-4">
                  <p className="text-xs text-gray-500">{c.label}</p>
                  <p className={`text-lg font-bold ${c.color}`}>₹ {fmt(c.value)}</p>
                </Card>
              ))}
            </div>

            <Card className="p-5 overflow-x-auto">
              <h3 className="font-semibold text-gray-800 mb-3">Sec 3.1 — Outward Taxable Supplies</h3>
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 font-medium">Component</th>
                    <th className="py-2 text-right font-medium">Taxable</th>
                    <th className="py-2 text-right font-medium">IGST</th>
                    <th className="py-2 text-right font-medium">CGST</th>
                    <th className="py-2 text-right font-medium">SGST</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-800 font-medium">(a) Taxable supplies</td>
                    <td className="py-2 text-right"><Money v={s3.a?.txval} /></td>
                    <td className="py-2 text-right"><Money v={s3.a?.iamt} /></td>
                    <td className="py-2 text-right"><Money v={s3.a?.camt} /></td>
                    <td className="py-2 text-right"><Money v={s3.a?.samt} /></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-800 font-medium">(b) Zero-rated (exports)</td>
                    <td className="py-2 text-right"><Money v={s3.b?.sup_for_dupay?.txval} /></td>
                    <td className="py-2 text-right"><Money v={s3.b?.sup_for_dupay?.iamt} /></td>
                    <td className="py-2 text-right text-gray-400">—</td>
                    <td className="py-2 text-right text-gray-400">—</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-800 font-medium">(c) Nil / exempt / non-GST</td>
                    <td className="py-2 text-right"><Money v={s3.c?.txval} /></td>
                    <td className="py-2 text-right text-gray-400" colSpan="3">—</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3">{s3.note}</p>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Sec 4 — Input Tax Credit</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-600">IGST (from purchases)</span><span className="font-medium"><Money v={s4.ITC_available?.iamt} /></span></div>
                  <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-600">CGST</span><span className="font-medium"><Money v={s4.ITC_available?.camt} /></span></div>
                  <div className="flex justify-between"><span className="text-gray-600">SGST / UTGST</span><span className="font-medium"><Money v={s4.ITC_available?.samt} /></span></div>
                  <p className="text-xs text-gray-400 mt-3">{s4.note}</p>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Sec 6 — Net GST Payable</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-600">Inter-state (IGST)</span><span className="font-medium"><Money v={g3b.sections?.s6?.interState} /></span></div>
                  <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-600">Intra-state (CGST+SGST)</span><span className="font-medium"><Money v={g3b.sections?.s6?.intraState} /></span></div>
                  <div className="flex justify-between"><span className="text-gray-700 font-medium">Total tax payable</span><span className="font-bold text-gray-800"><Money v={g3b.sections?.s6?.totalTax} /></span></div>
                  <p className="text-xs text-gray-400 mt-3">Uses recorded GST on sales and purchases in the period. For correct CGST/SGST split of input tax, record supplier state codes on purchase parties.</p>
                </div>
              </Card>
            </div>
          </>
        )
      )}
    </div>
  );
};

export default Gst;