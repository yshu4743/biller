import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';
import { Card, Button, Input, Select, Modal, Spinner, EmptyState } from '../components/ui.jsx';
import { Warehouse, Trash2, Pencil, Plus, ArrowLeftRight } from 'lucide-react';

const Godowns = () => {
  const [godowns, setGodowns] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '' });
  const [transfer, setTransfer] = useState({ itemId: '', fromGodown: '', toGodown: '', qty: 1 });
  const [transferMsg, setTransferMsg] = useState('');
  const [transfering, setTransfering] = useState(false);

  const load = async () => {
    setLoading(true);
    const [g, i] = await Promise.all([api.get('/godowns'), api.get('/items')]);
    setGodowns(g.data);
    setItems(i.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return alert('Godown name is required');
    if (editing) await api.put(`/godowns/${editing}`, form);
    else await api.post('/godowns', form);
    setModalOpen(false);
    setForm({ name: '', address: '' });
    setEditing(null);
    load();
  };

  const remove = async (g) => {
    if (!confirm(`Delete godown "${g.name}"? Allocation on items will be removed.`)) return;
    await api.delete(`/godowns/${g._id}`);
    load();
  };

  const doTransfer = async () => {
    setTransferMsg('');
    if (!transfer.itemId || !transfer.fromGodown || !transfer.toGodown) return alert('Select item, source and destination godown');
    setTransfering(true);
    try {
      await api.post('/godowns/transfer', transfer);
      setTransferMsg('Stock transferred successfully.');
      setTransfer({ itemId: '', fromGodown: '', toGodown: '', qty: 1 });
      load();
    } catch (err) {
      setTransferMsg(err.response?.data?.message || 'Transfer failed');
    } finally {
      setTransfering(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Godowns / Warehouses</h2>
          <p className="text-sm text-gray-500">Manage locations and transfer stock between godowns</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', address: '' }); setModalOpen(true); }}>
          <Plus size={16} className="mr-1" /> Add Godown
        </Button>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><ArrowLeftRight size={16} /> Transfer Stock Between Godowns</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select label="Item" value={transfer.itemId} onChange={(e) => setTransfer({ ...transfer, itemId: e.target.value })}>
            <option value="">Select item</option>
            {items.map((i) => <option key={i._id} value={i._id}>{i.name} (stock {i.stock})</option>)}
          </Select>
          <Select label="From Godown" value={transfer.fromGodown} onChange={(e) => setTransfer({ ...transfer, fromGodown: e.target.value })}>
            <option value="">From</option>
            {godowns.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
          </Select>
          <Select label="To Godown" value={transfer.toGodown} onChange={(e) => setTransfer({ ...transfer, toGodown: e.target.value })}>
            <option value="">To</option>
            {godowns.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
          </Select>
          <div className="flex items-end gap-2">
            <Input type="number" min="1" label="Qty" value={transfer.qty} onChange={(e) => setTransfer({ ...transfer, qty: e.target.value })} />
            <Button onClick={doTransfer} disabled={transfering}><ArrowLeftRight size={16} /></Button>
          </div>
        </div>
        {transferMsg && <p className={`text-sm mt-2 ${transferMsg.includes('successfully') ? 'text-emerald-600' : 'text-red-600'}`}>{transferMsg}</p>}
        <p className="text-xs text-gray-400 mt-1">Source godown quantity is checked before transfer.</p>
      </Card>

      <Card className="overflow-x-auto">
        {godowns.length === 0 ? (
          <EmptyState message="No godowns yet. Add one to track stock by location." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 font-medium">Name</th>
                <th className="py-3 px-4 font-medium">Address</th>
                <th className="py-3 px-4 font-medium">Default</th>
                <th className="py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {godowns.map((g) => (
                <tr key={g._id} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-800 flex items-center gap-2"><Warehouse size={16} className="text-gray-400" /> {g.name}</td>
                  <td className="py-3 px-4 text-gray-500">{g.address || '-'}</td>
                  <td className="py-3 px-4">{g.isDefault ? '✓' : '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(g._id); setForm({ name: g.name, address: g.address }); setModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600"><Pencil size={16} /></button>
                      <button onClick={() => remove(g)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Godown' : 'Add Godown'} maxWidth="max-w-md">
        <div className="space-y-4">
          <Input label="Godown Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Store, Back Room" />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Update' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Godowns;