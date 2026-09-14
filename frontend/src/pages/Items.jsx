import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, PackagePlus, Layers, Plus, X, Barcode } from 'lucide-react';
import api from '../api/axios.js';
import { Card, Button, Input, Select, Modal, Badge, SearchInput, Spinner, EmptyState, ErrorState } from '../components/ui.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

const emptyForm = {
  name: '', keyword: '', hsn: '', sku: '', barcode: '', unit: 'pcs', category: 'General',
  purchasePrice: 0, salePrice: 0, mrp: 0, wholesalePrice: 0, gstRate: 0, gstIncluded: false,
  stock: 0, lowStockAlert: 0, batch: '', expiryDate: '', isService: false,
  defaultGodown: '', godownsQty: {},
};

const units = ['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'dozen', 'bag', 'bottle', 'roll', 'meter', 'set', 'pair', 'tin', 'carton'];

const newBulkRow = () => ({
  name: '', keyword: '', hsn: '', unit: 'pcs', category: 'General',
  purchasePrice: 0, salePrice: 0, mrp: 0, gstRate: 0, gstIncluded: false, stock: 0, lowStockAlert: 0,
});

const Items = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [stockModal, setStockModal] = useState(null);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkRows, setBulkRows] = useState([newBulkRow()]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [godowns, setGodowns] = useState([]);

  const parseCsv = () => {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return alert('Paste at least one line');
    const stripped = lines.map((l) => l.replace(/^\s*[:-]\s*/, ''));
    const rows = stripped.map((line) => {
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      const c = cols.map((x) => x.trim());
      const firstRowIsHeader = /name/i.test(c[0] || '') && /(price|mrp|stock|hsn)/i.test(cols.slice(1).join(' '));
      const data = firstRowIsHeader ? c.slice(1) : c;
      const [name, keyword, hsn, unit, purchasePrice, salePrice, mrp, gstRate, stock, lowStockAlert] = data;
      return {
        ...newBulkRow(),
        name: name || '',
        keyword: keyword || '',
        hsn: hsn || '',
        unit: (unit || 'pcs').toLowerCase(),
        purchasePrice: parseFloat(purchasePrice) || 0,
        salePrice: parseFloat(salePrice) || 0,
        mrp: parseFloat(mrp) || 0,
        gstRate: parseFloat(gstRate) || 0,
        stock: parseFloat(stock) || 0,
        lowStockAlert: parseFloat(lowStockAlert) || 0,
      };
    });
    const header = lines[0] && /name/i.test(lines[0]) && /(price|stock|hsn|mrp|gst)/i.test(lines[0]) ? 1 : 0;
    const final = header && rows.length === lines.length ? rows : rows.filter((r) => r.name);
    setBulkRows(final.length ? final : [newBulkRow()]);
    setCsvText('');
    alert(`${final.length} item(s) loaded from CSV/Excel. Review and save.`);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (lowOnly) params.lowStock = 'true';
      const res = await api.get('/items', { params });
      setItems(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, lowOnly]);

useEffect(() => {
  api.get('/godowns').then((res) => setGodowns(res.data)).catch(() => {});
}, []);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (item) => {
    setEditId(item._id);
    const godownsQty = {};
    (item.godowns || []).forEach((g) => { if (g.godown) godownsQty[g.godown] = g.qty; });
    setForm({ ...emptyForm, ...item, defaultGodown: item.defaultGodown || '', godownsQty, expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : '' });
    setModalOpen(true);
  };
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setGodownQty = (godownId, value) => setForm((f) => ({ ...f, godownsQty: { ...f.godownsQty, [godownId]: value } }));

  const handleSubmit = async () => {
    if (!form.name) return alert('Item name is required');
    const godowns = Object.entries(form.godownsQty)
      .filter(([, q]) => Number(q) > 0)
      .map(([godown, qty]) => ({ godown, qty: Number(qty) }));
    const godownStock = godowns.length > 0 ? godowns.reduce((s, g) => s + g.qty, 0) : null;
    const payload = {
      ...form,
      godowns,
      defaultGodown: form.defaultGodown || undefined,
      stock: !form.isService && godownStock !== null ? godownStock : form.stock,
    };
    delete payload.godownsQty;
    try {
      if (editId) await api.put(`/items/${editId}`, payload);
      else await api.post('/items', payload);
      setModalOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save item');
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete item "${item.name}"?`)) return;
    await api.delete(`/items/${item._id}`);
    load();
  };

  const handleAdjust = async (type) => {
    const amount = type === 'add' ? Number(stockModal.amount) : -Number(stockModal.amount);
    if (!amount) return;
    await api.put(`/items/${stockModal.item._id}/stock`, { adjustment: amount });
    setStockModal(null);
    load();
  };

  const openBulk = () => { setBulkRows([newBulkRow()]); setBulkModal(true); };
  const setBulkRow = (idx, key, value) => setBulkRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));

  const handleLabels = async (itemIds) => {
    if (items.length === 0) return;
    const ids = itemIds || items.map((i) => i._id);
    handleBarcodeGeneration(ids, ids.join(','));
  };

  const handleBarcodeGeneration = async (ids, nav) => {
    try {
      await api.post('/items/generate-barcodes', { ids });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate barcodes');
      return;
    }
    window.location.href = `/barcodes?ids=${nav || ids.join(',')}`;
  };

  const handleBulkSubmit = async () => {
    const valid = bulkRows.filter((r) => r.name && r.name.trim());
    if (valid.length === 0) return alert('Enter at least one item with a name');
    setBulkSaving(true);
    try {
      const res = await api.post('/items/bulk', { items: valid });
      alert(`${res.data.count} item(s) added successfully`);
      setBulkModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add items');
    } finally {
      setBulkSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {error && <ErrorState message={error} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Items & Stock</h2>
          <p className="text-sm text-gray-500">Manage products, prices and inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={openBulk}><Layers size={16} className="mr-1 inline" /> Bulk Add</Button>
          <Button variant="secondary" onClick={() => handleLabels()}><Barcode size={16} className="mr-1 inline" /> Barcode Labels</Button>
          <Button onClick={openCreate}>Add Item</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, keyword, HSN, barcode..." className="flex-1" />
        <label className="flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-2">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      <Card className="overflow-x-auto">
        {items.length === 0 ? (
          <EmptyState message="No items found" />
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 font-medium">Item</th>
                <th className="py-3 px-4 font-medium">HSN</th>
                <th className="py-3 px-4 font-medium">Unit</th>
                <th className="py-3 px-4 font-medium text-right">Purchase</th>
                <th className="py-3 px-4 font-medium text-right">Sale</th>
                <th className="py-3 px-4 font-medium text-right">MRP</th>
                <th className="py-3 px-4 font-medium text-center">GST</th>
                <th className="py-3 px-4 font-medium text-right">Stock</th>
                <th className="py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const low = !item.isService && item.stock <= item.lowStockAlert;
                return (
                  <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      {item.keyword && <p className="text-xs text-gray-400">{item.keyword}</p>}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{item.hsn || '-'}</td>
                    <td className="py-3 px-4 text-gray-500">{item.unit}</td>
                    <td className="py-3 px-4 text-right">₹ {formatCurrency(item.purchasePrice)}</td>
                    <td className="py-3 px-4 text-right font-medium">₹ {formatCurrency(item.salePrice)}</td>
                    <td className="py-3 px-4 text-right">{item.mrp ? '₹ ' + formatCurrency(item.mrp) : '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge color={item.gstRate === 0 ? 'gray' : 'blue'}>{item.gstRate}%</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-semibold ${low ? 'text-red-600' : 'text-gray-800'}`}>{item.stock}</span>
                      {low && <div><Badge color="red">Low</Badge></div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setStockModal({ item })} className="p-1.5 text-gray-400 hover:text-indigo-600" title="Adjust stock">
                          <PackagePlus size={16} />
                        </button>
                        <button onClick={() => handleLabels([item._id])} className="p-1.5 text-gray-400 hover:text-indigo-600" title="Print barcode label">
                          {item.barcode && <span className="mr-1 text-xs text-emerald-600">●</span>}<Barcode size={16} />
                        </button>
                        <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-indigo-600"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Item' : 'Add Item'} maxWidth="max-w-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Input label="Item Name *" value={form.name} onChange={(e) => set('name', e.target.value)} className="sm:col-span-2" />
          <Input label="Keyword" value={form.keyword} onChange={(e) => set('keyword', e.target.value)} placeholder="e.g. salt, tata salt" />
          <Input label="HSN Code" value={form.hsn} onChange={(e) => set('hsn', e.target.value)} />
          <Input label="SKU" value={form.sku} onChange={(e) => set('sku', e.target.value)} />
          <Input label="Barcode" value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
          <Select label="Unit" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
          <Input label="Category" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="General" />
          <Input type="number" label="Purchase Price" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
          <Input type="number" label="Sale Price" value={form.salePrice} onChange={(e) => set('salePrice', e.target.value)} />
          <Input type="number" label="MRP" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} />
          <Input type="number" label="Wholesale Price" value={form.wholesalePrice} onChange={(e) => set('wholesalePrice', e.target.value)} />
          <Input type="number" label="GST Rate (%)" value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.gstIncluded} onChange={(e) => set('gstIncluded', e.target.checked)} />
            GST included in price
          </label>
          <Input type="number" label="Stock" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
          <Input type="number" label="Low Stock Alert" value={form.lowStockAlert} onChange={(e) => set('lowStockAlert', e.target.value)} />
          {godowns.length > 0 && (
            <div className="col-span-2 sm:col-span-3 border-t border-gray-100 pt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Stock by Godown</p>
              <div className="grid grid-cols-2 gap-3">
                {godowns.map((g) => (
                  <Input key={g._id} type="number" label={g.name} value={form.godownsQty[g._id] ?? ''} placeholder="0" onChange={(e) => setGodownQty(g._id, e.target.value)} />
                ))}
              </div>
              <Select label="Default Godown (bills deduct this first)" value={form.defaultGodown} onChange={(e) => set('defaultGodown', e.target.value)} className="mt-3">
                <option value="">None</option>
                {godowns.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
              </Select>
            </div>
          )}
          <Input label="Batch No." value={form.batch} onChange={(e) => set('batch', e.target.value)} />
          <Input type="date" label="Expiry Date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isService} onChange={(e) => set('isService', e.target.checked)} />
            This is a service
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{editId ? 'Update' : 'Save'}</Button>
        </div>
      </Modal>

      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={`Adjust Stock - ${stockModal?.item?.name}`} maxWidth="max-w-sm">
        {stockModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Current stock: <b>{stockModal.item.stock}</b> {stockModal.item.unit}</p>
            <Input type="number" label="Quantity to add/subtract" placeholder="e.g. 10 or -5" onChange={(e) => setStockModal({ ...stockModal, amount: e.target.value })} />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setStockModal(null)}>Cancel</Button>
              <Button onClick={() => handleAdjust('add')}>Adjust</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="Bulk Add Items" maxWidth="max-w-4xl">
        <div className="border border-gray-200 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Paste from Excel / CSV</p>
          <p className="text-xs text-gray-500 mb-2">
            One item per line. Columns: <code className="bg-gray-100 px-1 rounded">Name, Keyword, HSN, Unit, Purchase ₹, Sale ₹, MRP ₹, GST %, Stock, Low Alert</code>
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={"Steel Spoon,spoon,8215,pcs,20,35,40,18,100,10\nPlastic Mug,mug,3924,pcs,10,25,30,18,200,20"}
          />
          <Button variant="secondary" onClick={parseCsv} className="mt-2"><Layers size={15} className="mr-1 inline" /> Load Into List</Button>
        </div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">Add multiple items at once. Fill each row and save.</p>
          <Button variant="secondary" onClick={() => setBulkRows((r) => [...r, newBulkRow()])}><Plus size={16} className="mr-1 inline" /> Add Row</Button>
        </div>
        <div className="space-y-3">
          {bulkRows.map((row, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Item {idx + 1}</span>
                <button onClick={() => setBulkRows((r) => r.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-600" title="Remove row">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                <Input placeholder="Item Name *" value={row.name} onChange={(e) => setBulkRow(idx, 'name', e.target.value)} className="col-span-2 lg:col-span-2" />
                <Input placeholder="Keyword" value={row.keyword} onChange={(e) => setBulkRow(idx, 'keyword', e.target.value)} />
                <Input placeholder="HSN" value={row.hsn} onChange={(e) => setBulkRow(idx, 'hsn', e.target.value)} />
                <Select value={row.unit} onChange={(e) => setBulkRow(idx, 'unit', e.target.value)}>
                  {units.map((u) => <option key={u} value={u}>{u}</option>)}
                </Select>
                <Input type="number" placeholder="Purchase ₹" value={row.purchasePrice} onChange={(e) => setBulkRow(idx, 'purchasePrice', e.target.value)} />
                <Input type="number" placeholder="Sale ₹" value={row.salePrice} onChange={(e) => setBulkRow(idx, 'salePrice', e.target.value)} />
                <Input type="number" placeholder="Stock" value={row.stock} onChange={(e) => setBulkRow(idx, 'stock', e.target.value)} />
                <Input type="number" placeholder="GST %" value={row.gstRate} onChange={(e) => setBulkRow(idx, 'gstRate', e.target.value)} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setBulkModal(false)}>Cancel</Button>
          <Button onClick={handleBulkSubmit} disabled={bulkSaving}>{bulkSaving ? 'Saving...' : 'Save All'}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Items;