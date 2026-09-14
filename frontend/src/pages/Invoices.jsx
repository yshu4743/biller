import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Trash2, FilePlus2, ChevronLeft, ChevronRight, Layers, FileCheck2, Truck, Download } from 'lucide-react';
import api from '../api/axios.js';
import { Card, Button, Select, Input, Badge, SearchInput, Spinner, EmptyState, Modal } from '../components/ui.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);

  const toggleSelect = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => {
    if (selected.length === invoices.length) setSelected([]);
    else setSelected(invoices.map((i) => i._id));
  };
  const handleBulkPrint = () => {
    if (selected.length === 0) return alert('Select at least one bill to print');
    navigate(`/invoices/print-bulk?ids=${selected.join(',')}`);
  };

  const load = async (p = page) => {
    setLoading(true);
    const params = { page: p, limit: 25 };
    if (search) params.search = search;
    if (status) params.status = status;
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await api.get('/invoices', { params });
    setInvoices(res.data.invoices);
    setPages(res.data.pages);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => load(1), 400);
    return () => clearTimeout(t);
  }, [search, status, from, to]);

  useEffect(() => { load(page); }, [page]);

  const handlePrint = (id) => navigate(`/invoices/${id}/print`);

  const handleDelete = async (inv) => {
    if (!confirm(`Delete bill ${inv.billNumber}? Stock will be restored.`)) return;
    await api.delete(`/invoices/${inv._id}`);
    load();
  };

  const genEInvoice = async (inv) => {
    setBusy(inv._id);
    try {
      const res = await api.post(`/invoices/${inv._id}/e-invoice`);
      const invData = res.data.invoice || inv;
      setResult({
        title: `e-Invoice · ${invData.billNumber}`,
        kind: 'einvoice',
        rows: [
          ['IRN', invData.eInvoice?.irn],
          ['Ack No', invData.eInvoice?.ackNo],
          ['Ack Date', invData.eInvoice?.ackDate ? formatDate(invData.eInvoice.ackDate) : '-'],
          ['Status', (invData.eInvoice?.status || '').toUpperCase()],
        ],
        billNumber: invData.billNumber,
        invoiceId: inv._id,
      });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate e-Invoice');
    } finally {
      setBusy(null);
    }
  };

  const genEWayBill = async (inv) => {
    setBusy(inv._id);
    try {
      const res = await api.post(`/invoices/${inv._id}/e-way-bill`);
      const invData = res.data.invoice || inv;
      const ewb = invData.eWayBill;
      setResult({
        title: `E-Way Bill · ${invData.billNumber}`,
        kind: 'eway',
        rows: [
          ['E-Way Bill No', ewb?.no],
          ['Generated On', ewb?.date ? formatDate(ewb.date) : '-'],
          ['Valid Until', ewb?.expiry ? formatDate(ewb.expiry) : '-'],
          ['Movement', ewb?.intraState ? 'Within state (15 days)' : 'Inter-state (1 day)'],
          ['Consignment Value', `₹ ${formatCurrency(ewb?.value)} ${ewb?.thresholdMet ? '(exceeds ₹50,000 - required)' : '(below ₹50,000 - optional)'}`],
        ],
        billNumber: invData.billNumber,
        invoiceId: inv._id,
      });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate E-Way bill');
    } finally {
      setBusy(null);
    }
  };

  const downloadEInvoiceJson = async () => {
    if (!result) return;
    const res = await api.get(`/invoices/${result.invoiceId}/e-invoice/json`);
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.billNumber}-einvoice.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Invoices</h2>
          <p className="text-sm text-gray-500">All sale bills</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.length > 0 && (
            <Button variant="secondary" onClick={handleBulkPrint}>
              <Layers size={16} className="mr-1" /> Print Selected ({selected.length})
            </Button>
          )}
          <Button onClick={() => navigate('/billing')}>
            <FilePlus2 size={16} className="mr-1" /> New Bill
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search bill no / party..." className="flex-1" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="">All status</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
      </div>

      <Card className="overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : invoices.length === 0 ? (
          <EmptyState message="No invoices found" />
        ) : (
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 font-medium w-10">
                  <input type="checkbox" checked={selected.length === invoices.length && invoices.length > 0} onChange={toggleAll} className="h-4 w-4" />
                </th>
                <th className="py-3 px-4 font-medium">Bill No</th>
                <th className="py-3 px-4 font-medium">Party</th>
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium text-right">Items</th>
                <th className="py-3 px-4 font-medium text-right">Total</th>
                <th className="py-3 px-4 font-medium text-right">Paid</th>
                <th className="py-3 px-4 font-medium text-center">Mode</th>
                <th className="py-3 px-4 font-medium text-center">Status</th>
                <th className="py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <input type="checkbox" checked={selected.includes(inv._id)} onChange={() => toggleSelect(inv._id)} className="h-4 w-4" />
                  </td>
                  <td className="py-3 px-4 font-medium text-indigo-600">{inv.billNumber}</td>
                  <td className="py-3 px-4">{inv.partySnapshot?.name || inv.party?.name || '-'}</td>
                  <td className="py-3 px-4 text-gray-500">{formatDate(inv.date)}</td>
                  <td className="py-3 px-4 text-right">{inv.items.length}</td>
                  <td className="py-3 px-4 text-right font-semibold">₹ {formatCurrency(inv.total)}</td>
                  <td className="py-3 px-4 text-right text-gray-500">₹ {formatCurrency(inv.paidAmount)}</td>
                  <td className="py-3 px-4 text-center uppercase text-xs text-gray-500">{inv.paymentMode}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge color={inv.status === 'paid' ? 'green' : inv.status === 'partial' ? 'yellow' : 'red'}>{inv.status}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button title="e-Invoice" disabled={busy === inv._id} onClick={() => genEInvoice(inv)} className="p-1.5 text-gray-400 hover:text-emerald-600 disabled:opacity-40">
                        {busy === inv._id ? <FileCheck2 size={16} className="animate-pulse" /> : <FileCheck2 size={16} />}
                      </button>
                      <button title="E-Way Bill" disabled={busy === inv._id} onClick={() => genEWayBill(inv)} className="p-1.5 text-gray-400 hover:text-amber-600 disabled:opacity-40">
                        <Truck size={16} />
                      </button>
                      <button onClick={() => handlePrint(inv._id)} className="p-1.5 text-gray-400 hover:text-indigo-600"><Printer size={16} /></button>
                      <button onClick={() => handleDelete(inv)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={16} /> Prev
          </Button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight size={16} />
          </Button>
        </div>
      )}

      <Modal open={!!result} onClose={() => setResult(null)} title={result?.title} maxWidth="max-w-md">
        <div className="space-y-3">
          <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-2">
            {result?.rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-800 break-all text-right">{v}</span>
              </div>
            ))}
          </div>
          {result?.kind === 'einvoice' && (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={downloadEInvoiceJson}><Download size={15} className="mr-1" /> Download JSON</Button>
            </div>
          )}
          <p className="text-xs text-gray-400">Generated locally in this app. To report to the GSTN portal you would connect your GSP/API credentials here.</p>
        </div>
      </Modal>
    </div>
  );
};

export default Invoices;