import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ShoppingCart, Search } from 'lucide-react';
import api from '../api/axios.js';
import { Card, Button, Input, Select, Modal, Badge, SearchInput, Spinner, EmptyState } from '../components/ui.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

const PurchasePage = () => {
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [partyId, setPartyId] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [paymentMode, setPaymentMode] = useState('credit');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [showList, setShowList] = useState(true);

  const load = () => {
    setError('');
    api.get('/parties').then((res) => setParties(res.data));
    api.get('/items').then((res) => setItems(res.data));
    api.get('/purchases').then((res) => setPurchases(res.data)).catch((err) => setError(err?.response?.data?.message || 'Failed to load purchases.'));
  };
  useEffect(() => { load(); }, []);

  const addItem = (item) => {
    const existing = cart.find((c) => c.itemId === item._id);
    if (existing) setCart(cart.map((c) => (c.itemId === item._id ? { ...c, quantity: c.quantity + 1 } : c)));
    else setCart([...cart, { itemId: item._id, name: item.name, hsn: item.hsn, unit: item.unit, quantity: 1, price: item.purchasePrice, gstRate: item.gstRate }]);
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, c) => s + Number(c.quantity) * Number(c.price), 0);
    const gst = cart.reduce((s, c) => s + (Number(c.quantity) * Number(c.price) * (Number(c.gstRate) || 0)) / 100, 0);
    return { subtotal, gst, total: Math.round((subtotal + gst) * 100) / 100 };
  }, [cart]);

  const effectivePaid = paidAmount === '' ? 0 : Number(paidAmount);

  const handleSave = async () => {
    setError('');
    if (!partyId) return setError('Select a supplier party');
    if (cart.length === 0) return setError('Add at least one item');
    if (effectivePaid > totals.total) return setError('Paid amount exceeds total');
    setSaving(true);
    try {
      await api.post('/purchases', {
        company: (await api.get('/companies')).data[0]?._id,
        partyId,
        items: cart.map((c) => ({ itemId: c.itemId, quantity: Number(c.quantity), price: Number(c.price), gstRate: c.gstRate })),
        paymentMode,
        paidAmount: effectivePaid,
        notes,
      }).then(() => {
        setCart([]);
        setPartyId('');
        setPaidAmount('');
        setError('');
        setShowList(true);
        load();
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Delete purchase ${p.purchaseBillNumber}? Stock will be ${p.type === 'purchase_return' ? 'restored' : 'reduced'}.`)) return;
    await api.delete(`/purchases/${p._id}`);
    load();
  };

  const handleReturn = async (p) => {
    if (!confirm(`Record a purchase return (debit note) for ${p.purchaseBillNumber}? This reduces stock and creates a PRT entry.`)) return;
    setError('');
    try {
      await api.post(`/purchases/${p._id}/return`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record return');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Purchases</h2>
          <p className="text-sm text-gray-500">Record purchases from suppliers (stock increases automatically)</p>
        </div>
        <div className="flex gap-2">
          <Button variant={showList ? 'secondary' : 'primary'} onClick={() => setShowList(false)}>
            <ShoppingCart size={16} className="mr-1" /> New Purchase
          </Button>
          <Button variant={showList ? 'primary' : 'secondary'} onClick={() => setShowList(true)}>List</Button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg border border-red-100">{error}</div>}

      {showList ? (
        <Card className="overflow-x-auto">
          {purchases.length === 0 ? <EmptyState message="No purchases yet" /> : (
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                  <th className="py-3 px-4 font-medium">Bill No</th>
                  <th className="py-3 px-4 font-medium">Supplier</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium text-right">Items</th>
                  <th className="py-3 px-4 font-medium text-right">Total</th>
                  <th className="py-3 px-4 font-medium text-right">Paid</th>
                  <th className="py-3 px-4 font-medium text-center">Status</th>
                  <th className="py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-indigo-600">{p.purchaseBillNumber}</p>
                      {p.type === 'purchase_return' && <Badge color="red">Return</Badge>}
                    </td>
                    <td className="py-3 px-4">{p.party?.name || p.partySnapshot || '-'}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(p.date)}</td>
                    <td className="py-3 px-4 text-right">{p.items.length}</td>
                    <td className="py-3 px-4 text-right font-semibold">₹ {formatCurrency(p.total)}</td>
                    <td className="py-3 px-4 text-right text-gray-500">₹ {formatCurrency(p.paidAmount)}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge color={p.type === 'purchase_return' ? 'yellow' : p.status === 'paid' ? 'green' : p.status === 'partial' ? 'yellow' : 'red'}>{p.type === 'purchase_return' ? 'adjusted' : p.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {p.type === 'purchase' && (
                          <button onClick={() => handleReturn(p)} title="Record purchase return" className="text-xs font-medium text-red-600 hover:underline">Return</button>
                        )}
                        <button onClick={() => handleDelete(p)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : (
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Supplier</h3>
            <select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">Select supplier party</option>
              {parties.filter((p) => p.partyType !== 'customer').map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Items to Purchase</h3>
            <SearchInput value={itemSearch} onChange={setItemSearch} placeholder="Search item..." className="mb-3" />
            {items.filter((i) => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase())).length > 0 && (
              <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto mb-4">
                {items.filter((i) => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase())).slice(0, 20).map((item) => (
                  <div key={item._id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{item.name}</p>
                      <p className="text-xs text-gray-400">Stock: {item.stock} | Purchase ₹ {formatCurrency(item.purchasePrice)}</p>
                    </div>
                    <button onClick={() => addItem(item)} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
                      <Plus size={14} /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No items added</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-3 font-medium">Item</th>
                    <th className="py-2 pr-3 font-medium w-20 text-center">Qty</th>
                    <th className="py-2 pr-3 font-medium text-right w-32">Rate</th>
                    <th className="py-2 pr-3 font-medium text-right">Amount</th>
                    <th className="py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((c) => (
                    <tr key={c.itemId} className="border-b border-gray-100">
                      <td className="py-2 pr-3 font-medium text-gray-800">{c.name}</td>
                      <td className="py-2 pr-3 text-center">
                        <input type="number" min="0" value={c.quantity} onChange={(e) => setCart(cart.map((x) => x.itemId === c.itemId ? { ...x, quantity: e.target.value } : x))} className="w-16 px-2 py-1 border border-gray-300 rounded text-center" />
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <input type="number" value={c.price} onChange={(e) => setCart(cart.map((x) => x.itemId === c.itemId ? { ...x, price: e.target.value } : x))} className="w-28 px-2 py-1 border border-gray-300 rounded text-right" />
                      </td>
                      <td className="py-2 pr-3 text-right font-medium">₹ {formatCurrency(Number(c.quantity) * Number(c.price))}</td>
                      <td className="py-2"><button onClick={() => setCart(cart.filter((x) => x.itemId !== c.itemId))} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Payment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select label="Payment Mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="credit">Credit</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank">Bank</option>
              </Select>
              <Input type="number" label="Paid Amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex items-center justify-between mt-5 bg-gray-50 rounded-lg p-4">
              <div className="space-y-1 text-sm">
                <p className="text-gray-600">Subtotal: ₹ {formatCurrency(totals.subtotal)}</p>
                <p className="text-gray-600">GST: ₹ {formatCurrency(totals.gst)}</p>
                <p className="text-lg font-bold text-gray-800">Total: ₹ {formatCurrency(totals.total)}</p>
              </div>
              <Button onClick={handleSave} disabled={saving} className="py-2.5 px-6">{saving ? 'Saving...' : 'Save Purchase'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PurchasePage;