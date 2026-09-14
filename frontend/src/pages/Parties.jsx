import React, { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import api from '../api/axios.js';
import { Card, Button, Input, Select, Modal, Badge, SearchInput, Spinner, EmptyState, ErrorState } from '../components/ui.jsx';
import { getIndiaStates } from '../utils/format.js';

const emptyForm = {
  name: '', shopName: '', partyType: 'customer', category: 'retailer', gstin: '', phone: '',
  email: '', address: '', city: '', state: '', stateCode: '', pincode: '',
  openingBalance: 0, balanceType: 'debit', creditLimit: 0,
};

const Parties = () => {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [gstCheck, setGstCheck] = useState(null);

  const load = async () => {
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      const res = await api.get('/parties', { params });
      setParties(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load parties.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setGstCheck(null); setModalOpen(true); };
  const openEdit = (p) => { setEditId(p._id); setGstCheck(null); setForm({ ...emptyForm, ...p }); setModalOpen(true); };
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const verifyGstin = async () => {
    setGstCheck(null);
    if (!form.gstin) return alert('Enter a GSTIN first');
    try {
      const res = await api.post('/gst/verify', { gstin: form.gstin });
      setGstCheck(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Verification failed');
    }
  };

  const onStateChange = (name) => {
    const state = getIndiaStates().find((s) => s.name === name);
    set('state', name);
    set('stateCode', state ? String(state.code) : '');
  };

  const handleSubmit = async () => {
    if (!form.name) return alert('Party name is required');
    try {
      if (editId) await api.put(`/parties/${editId}`, form);
      else await api.post('/parties', form);
      setModalOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save party');
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Delete party "${p.name}"?`)) return;
    await api.delete(`/parties/${p._id}`);
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {error && <ErrorState message={error} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Parties</h2>
          <p className="text-sm text-gray-500">Customers, shops and suppliers</p>
        </div>
        <Button onClick={openCreate}>Add Party</Button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search by name, shop, GSTIN, phone..." />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {parties.length === 0 && <Card className="md:col-span-2 xl:col-span-3"><EmptyState message="No parties found" /></Card>}
        {parties.map((p) => (
          <Card key={p._id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-800">{p.name}</p>
                {p.shopName && <p className="text-xs text-gray-400">{p.shopName}</p>}
                <div className="flex gap-2 mt-2">
                  <Badge color={p.partyType === 'customer' ? 'blue' : p.partyType === 'supplier' ? 'yellow' : 'purple'}>{p.partyType}</Badge>
                  <Badge color="gray">{p.category}</Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-indigo-600"><Pencil size={15} /></button>
                <button onClick={() => handleDelete(p)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            </div>
            <div className="border-t border-gray-100 mt-3 pt-3 space-y-1 text-sm text-gray-600">
              {p.gstin && <p>GSTIN: <span className="text-gray-800">{p.gstin}</span></p>}
              {p.phone && <p>📞 {p.phone}</p>}
              {p.address && <p className="text-gray-500 truncate">{p.address}{p.city ? ', ' + p.city : ''}</p>}
              {(p.openingBalance > 0 || p.creditLimit > 0) && (
                <p className="text-xs text-gray-500">
                  {p.openingBalance > 0 && <>Opening: ₹ {p.openingBalance.toLocaleString('en-IN')}</>}
                  {p.creditLimit > 0 && <> | Credit limit: ₹ {p.creditLimit.toLocaleString('en-IN')}</>}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Party' : 'Add Party'} maxWidth="max-w-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Input label="Name *" value={form.name} onChange={(e) => set('name', e.target.value)} className="col-span-2" />
          <Input label="Shop Name" value={form.shopName} onChange={(e) => set('shopName', e.target.value)} className="col-span-2" />
          <Select label="Party Type" value={form.partyType} onChange={(e) => set('partyType', e.target.value)}>
            <option value="customer">Customer</option>
            <option value="supplier">Supplier</option>
            <option value="both">Customer & Supplier</option>
          </Select>
          <Select label="Category" value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="retailer">Retailer</option>
            <option value="wholesaler">Wholesaler</option>
            <option value="distributor">Distributor</option>
            <option value="other">Other</option>
          </Select>
          <div className="col-span-2 sm:col-span-3 flex items-end gap-2">
            <div className="flex-1">
              <Input label="GSTIN" value={form.gstin} onChange={(e) => set('gstin', e.target.value)} placeholder="07ABCDE1234F1Z5" />
              {gstCheck && (
                <div className={`text-xs mt-1 ${gstCheck.valid ? 'text-emerald-600' : 'text-red-600'}`}>
                  {gstCheck.valid ? '✓ Valid GSTIN' : `✗ ${gstCheck.errors.join('; ')}`}
                  {gstCheck.breakdown?.stateName && <span className="text-gray-500"> — State: {gstCheck.breakdown.stateName} · PAN: {gstCheck.breakdown.pan}</span>}
                </div>
              )}
            </div>
            <Button variant="secondary" onClick={verifyGstin}>Verify GSTIN</Button>
          </div>
          <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <Input label="Email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} className="col-span-2" />
          <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <Input label="Pincode" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} />
          <Select label="State" value={form.state} onChange={(e) => onStateChange(e.target.value)}>
            <option value="">Select State</option>
            {getIndiaStates().map((s) => <option key={s.code} value={s.name}>{s.name}</option>)}
          </Select>
          <Input type="number" label="Opening Balance" value={form.openingBalance} onChange={(e) => set('openingBalance', e.target.value)} />
          <Select label="Balance Type" value={form.balanceType} onChange={(e) => set('balanceType', e.target.value)}>
            <option value="debit">Debit (They owe us)</option>
            <option value="credit">Credit (We owe them)</option>
          </Select>
          <Input type="number" label="Credit Limit" value={form.creditLimit} onChange={(e) => set('creditLimit', e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{editId ? 'Update' : 'Save'}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Parties;