import React, { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Trash2, Smartphone } from 'lucide-react';
import api from '../api/axios.js';
import { Card, Button, Input, Select, Modal, Badge, Spinner, EmptyState, ErrorState } from '../components/ui.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [parties, setParties] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState('received');
  const [form, setForm] = useState({ party: '', type: 'received', amount: 0, mode: 'cash', date: new Date().toISOString().slice(0, 10), invoice: '', reference: '', note: '' });

  const load = async () => {
    setError('');
    try {
      const [p, o, allParties, invs] = await Promise.all([
        api.get('/payments'),
        api.get('/payments/outstanding'),
        api.get('/parties'),
        api.get('/invoices'),
      ]);
      setPayments(p.data);
      setOutstanding(o.data);
      setParties(allParties.data);
      setInvoices(invs.data.invoices || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const totalReceived = payments.filter((x) => x.type === 'received').reduce((s, x) => s + x.amount, 0);
  const totalPaid = payments.filter((x) => x.type === 'paid').reduce((s, x) => s + x.amount, 0);
  const totalDue = outstanding.reduce((s, o) => s + (o.due > 0 ? o.due : 0), 0);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.party || !form.amount) return alert('Party and amount required');
    try {
      await api.post('/payments', { ...form, type, date: form.date || new Date().toISOString(), amount: Number(form.amount) });
      setModalOpen(false);
      setForm({ party: '', type, amount: 0, mode: 'cash', date: new Date().toISOString().slice(0, 10), invoice: '', reference: '', note: '' });
      load();
    } catch (err) { alert(err.response?.data?.message || 'Failed to save'); }
  };

  const handleDelete = async (pm) => {
    if (!confirm('Delete this payment entry?')) return;
    await api.delete(`/payments/${pm._id}`);
    load();
  };

  const dueInvoices = form.invoice === '' && form.party ? invoices.filter((i) => i.party?._id === form.party || i.party === form.party) : invoices.filter((i) => (i.party?._id === form.party || i.party === form.party) && i._id === form.invoice);
  const partyDue = (() => {
    if (!form.party) return 0;
    const party = parties.find((p) => p._id === form.party);
    let due = party ? party.openingBalance * (party.balanceType === 'debit' ? 1 : -1) : 0;
    invoices.filter((i) => i.party?._id === form.party || i.party === form.party).forEach((i) => {
      due += i.invoiceType !== 'sale_return' ? (i.dueAmount || 0) : -(i.total || 0);
    });
    const received = payments.filter((p) => p.type === 'received' && !p.invoice && (p.party?._id === form.party || p.party === form.party)).reduce((s, p) => s + p.amount, 0);
    return due - received;
  })();

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {error && <ErrorState message={error} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Payments & Dues</h2>
          <p className="text-sm text-gray-500">Track money in and out</p>
        </div>
        <Button onClick={() => { setModalOpen(true); setType('received'); setForm((f) => ({ ...f, type: 'received' })); }}>
          Record Payment
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><ArrowDownCircle size={20} /></div>
            <div><p className="text-xs text-gray-500">Total Received</p><p className="font-bold">₹ {formatCurrency(totalReceived)}</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><ArrowUpCircle size={20} /></div>
            <div><p className="text-xs text-gray-500">Total Paid</p><p className="font-bold">₹ {formatCurrency(totalPaid)}</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center"><Smartphone size={20} /></div>
            <div><p className="text-xs text-gray-500">Outstanding Dues</p><p className="font-bold">₹ {formatCurrency(totalDue)}</p></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-x-auto">
          <h3 className="font-semibold text-gray-800 p-4 border-b border-gray-100">Party Outstanding</h3>
          {outstanding.length === 0 ? <EmptyState message="No outstanding dues" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50 text-xs">
                  <th className="py-2 px-4 font-medium">Party</th>
                  <th className="py-2 px-4 font-medium text-right">Due Amount</th>
                </tr>
              </thead>
              <tbody>
                {outstanding.filter((o) => o.due > 0).map((o) => (
                  <tr key={o.party._id} className="border-b border-gray-100">
                    <td className="py-2.5 px-4">{o.party.name}{o.party.shopName ? ` (${o.party.shopName})` : ''}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-red-600">₹ {formatCurrency(o.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="overflow-x-auto">
          <h3 className="font-semibold text-gray-800 p-4 border-b border-gray-100">Recent Payments</h3>
          {payments.length === 0 ? <EmptyState message="No payments recorded" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50 text-xs">
                  <th className="py-2 px-4 font-medium">Date</th>
                  <th className="py-2 px-4 font-medium">Party</th>
                  <th className="py-2 px-4 font-medium">Type</th>
                  <th className="py-2 px-4 font-medium text-right">Amount</th>
                  <th className="py-2 px-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 20).map((pm) => (
                  <tr key={pm._id} className="border-b border-gray-100">
                    <td className="py-2.5 px-4 text-gray-500">{formatDate(pm.date)}</td>
                    <td className="py-2.5 px-4">{pm.party?.name || '-'}</td>
                    <td className="py-2.5 px-4">
                      <Badge color={pm.type === 'received' ? 'green' : 'red'}>{pm.type}</Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium">₹ {formatCurrency(pm.amount)}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button onClick={() => handleDelete(pm)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={type === 'received' ? 'success' : 'secondary'} onClick={() => { setType('received'); setForm((f) => ({ ...f, type: 'received' })); }} className="flex-1">Money Received</Button>
            <Button variant={type === 'paid' ? 'danger' : 'secondary'} onClick={() => { setType('paid'); setForm((f) => ({ ...f, type: 'paid' })); }} className="flex-1">Money Paid</Button>
          </div>
          <Select label="Party *" value={form.party} onChange={(e) => set('party', e.target.value)}>
            <option value="">Select party</option>
            {parties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
          {form.party && (
            <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-sm">
              <span className="text-gray-600">Party due:</span>
              <b className={partyDue > 0 ? 'text-red-600' : 'text-emerald-600'}>₹ {formatCurrency(partyDue)}</b>
            </div>
          )}
          {type === 'received' && (
            <Select label="Bill (Invoice)" value={form.invoice} onChange={(e) => set('invoice', e.target.value)}>
              <option value="">— General payment (no specific bill) —</option>
              {dueInvoices.map((i) => (
                <option key={i._id} value={i._id}>{i.billNumber} (Due ₹ {formatCurrency(i.dueAmount || 0)})</option>
              ))}
            </Select>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" label="Date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            <Input type="number" label="Amount *" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
            <Select label="Mode" value={form.mode} onChange={(e) => set('mode', e.target.value)}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank">Bank</option>
              <option value="cheque">Cheque</option>
            </Select>
            <Input label="Reference" value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder="UPI ref / cheque no" />
          </div>
          <Input label="Note" value={form.note} onChange={(e) => set('note', e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Payments;