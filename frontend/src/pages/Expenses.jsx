import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import api from '../api/axios.js';
import { Card, Button, Input, Select, Modal, Badge, Spinner, EmptyState, ErrorState } from '../components/ui.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

const emptyForm = { expenseDate: '', category: 'General', amount: 0, mode: 'cash', note: '' };
const categories = ['General', 'Salary', 'Rent', 'Electricity', 'Transport', 'Recharge', 'Staff', 'Tea/Refreshment', 'Repairs', 'Other'];
const modes = ['cash', 'upi', 'card', 'bank', 'cheque'];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = () => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    api.get('/expenses', { params }).then((res) => { setError(''); setExpenses(res.data); }).catch((err) => setError(err?.response?.data?.message || 'Failed to load expenses.')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [from, to]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const openCreate = () => { setForm({ ...emptyForm, expenseDate: new Date().toISOString().slice(0, 10) }); setEditId(null); setModalOpen(true); };
  const openEdit = (e) => { setEditId(e._id); setForm({ ...e, expenseDate: e.expenseDate.slice(0, 10) }); setModalOpen(true); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.amount) return alert('Amount is required');
    try {
      if (editId) await api.put(`/expenses/${editId}`, form);
      else await api.post('/expenses', form);
      setModalOpen(false);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Failed to save'); }
  };

  const handleDelete = async (e) => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${e._id}`);
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {error && <ErrorState message={error} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Expenses</h2>
          <p className="text-sm text-gray-500">Total: <b>₹ {formatCurrency(total)}</b></p>
        </div>
        <Button onClick={openCreate}><Plus size={16} className="mr-1" /> Add Expense</Button>
      </div>

      <div className="flex gap-3">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
      </div>

      <Card className="overflow-x-auto">
        {expenses.length === 0 ? <EmptyState message="No expenses found" /> : (
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Mode</th>
                <th className="py-3 px-4 font-medium">Note</th>
                <th className="py-3 px-4 font-medium text-right">Amount</th>
                <th className="py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{formatDate(e.expenseDate)}</td>
                  <td className="py-3 px-4"><Badge color="yellow">{e.category}</Badge></td>
                  <td className="py-3 px-4 uppercase text-xs text-gray-500">{e.mode}</td>
                  <td className="py-3 px-4 text-gray-500">{e.note}</td>
                  <td className="py-3 px-4 text-right font-semibold text-red-600">- ₹ {formatCurrency(e.amount)}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(e)} className="p-1.5 text-gray-400 hover:text-indigo-600"><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(e)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Expense' : 'Add Expense'} maxWidth="max-w-md">
        <div className="space-y-4">
          <Input type="date" label="Date" value={form.expenseDate} onChange={(e) => set('expenseDate', e.target.value)} />
          <Select label="Category" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input type="number" label="Amount *" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          <Select label="Payment Mode" value={form.mode} onChange={(e) => set('mode', e.target.value)}>
            {modes.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Input label="Note" value={form.note} onChange={(e) => set('note', e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{editId ? 'Update' : 'Add'}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Expenses;