import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Trash2, FilePlus2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/axios.js';
import { Card, Button, Select, Input, Badge, SearchInput, Spinner, EmptyState } from '../components/ui.jsx';
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Invoices</h2>
          <p className="text-sm text-gray-500">All sale bills</p>
        </div>
        <Button onClick={() => navigate('/billing')}>
          <FilePlus2 size={16} className="mr-1" /> New Bill
        </Button>
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
    </div>
  );
};

export default Invoices;