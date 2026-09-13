import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Package, Users, Plus, Trash2, Printer, ArrowRight, AlertTriangle } from 'lucide-react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, Button, Select, Input, SearchInput } from '../components/ui.jsx';
import { formatCurrency, amountToWords } from '../utils/format.js';

const paymentModes = ['cash', 'upi', 'card', 'credit'];

const SetupWarnings = ({ company, items, parties }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-3">
      {!company && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-amber-50 border border-amber-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <p className="font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle size={15} /> Company not set up yet
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                Add your business details (name, GSTIN, address) to start billing. Bill numbers & GST invoices depend on this.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/company')} className="shrink-0">
            Set up Company <ArrowRight size={15} className="ml-1" />
          </Button>
        </div>
      )}

      {company && items.length === 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-sky-50 border border-sky-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <Package size={20} />
            </div>
            <div>
              <p className="font-semibold text-sky-800">No items yet</p>
              <p className="text-sm text-sky-700 mt-0.5">Add your products & prices so you can add them to a bill.</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => navigate('/items')} className="shrink-0">
            Add Items <ArrowRight size={15} className="ml-1" />
          </Button>
        </div>
      )}

      {company && parties.length === 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-pink-50 border border-pink-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 shrink-0">
              <Users size={20} />
            </div>
            <div>
              <p className="font-semibold text-pink-800">No parties yet</p>
              <p className="text-sm text-pink-700 mt-0.5">Add your customers / shops to bill them. Walk-in billing works without a party too.</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => navigate('/parties')} className="shrink-0">
            Add Parties <ArrowRight size={15} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

const Billing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [parties, setParties] = useState([]);
  const [partyId, setPartyId] = useState('');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [billing, setBilling] = useState({ discountType: 'amount', discountValue: 0, paymentMode: 'cash', paidAmount: '', notes: '', salesPerson: '' });
  const [saving, setSaving] = useState(false);

  const company = companies.find((c) => c._id === companyId) || null;
  const party = parties.find((p) => p._id === partyId) || null;
  const isGst = company?.isGstRegistered && company.gstin;
  const interstate = isGst && party?.gstin && company?.stateCode && party?.stateCode && company.stateCode !== party.stateCode;

  useEffect(() => {
    Promise.all([
      api.get('/companies'),
      api.get('/items'),
      api.get('/parties'),
    ]).then(([c, i, p]) => {
      setCompanies(c.data);
      if (c.data.length === 1) setCompanyId(c.data[0]._id);
      setItems(i.data);
      setParties(p.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.name) setBilling((b) => ({ ...b, salesPerson: b.salesPerson || user.name }));
  }, [user]);

  const setBillField = (key, value) => setBilling((b) => ({ ...b, [key]: value }));

  const addToCart = (item) => {
    const existing = cart.find((c) => c.itemId === item._id);
    if (existing) {
      setCart(cart.map((c) => (c.itemId === item._id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart([...cart, {
        itemId: item._id,
        name: item.name,
        hsn: item.hsn,
        unit: item.unit || 'pcs',
        price: Number(item.salePrice) || 0,
        mrp: item.mrp,
        gstRate: Number(item.gstRate) || 0,
        gstIncluded: !!item.gstIncluded,
        quantity: 1,
      }]);
    }
  };

  const setQty = (itemId, value) => {
    const quantity = Math.max(0, parseInt(value, 10) || 0);
    setCart(cart.map((c) => (c.itemId === itemId ? { ...c, quantity } : c)));
  };

  const removeFromCart = (itemId) => setCart(cart.filter((c) => c.itemId !== itemId));

  const searchResults = search
    ? items.filter((it) =>
        [it.name, it.keyword, it.hsn, it.barcode, it.sku].filter(Boolean).some((f) => f.toLowerCase().includes(search.toLowerCase()))
      ).slice(0, 8)
    : [];

  const totals = (() => {
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    const gstByRate = {};

    cart.forEach((c) => {
      const amount = c.quantity * c.price;
      const taxable = c.gstIncluded && c.gstRate > 0 ? amount / (1 + c.gstRate / 100) : amount;
      const gst = (taxable * c.gstRate) / 100;
      subtotal += amount;
      gstByRate[c.gstRate] = gstByRate[c.gstRate] || 0;
      gstByRate[c.gstRate] += gst;
      if (interstate) totalIgst += gst;
      else {
        totalCgst += gst / 2;
        totalSgst += gst / 2;
      }
    });

    let billDiscount = 0;
    const discountValue = Number(billing.discountValue) || 0;
    if (discountValue > 0) {
      if (billing.discountType === 'percent') billDiscount = (subtotal * discountValue) / 100;
      else billDiscount = discountValue;
    }

    const taxable = Math.max(0, subtotal - billDiscount);
    const totalGst = totalCgst + totalSgst + totalIgst;
    const rawTotal = taxable + totalGst;
    const roundOff = Math.round(rawTotal) - rawTotal;
    const total = Math.round(rawTotal);

    return { subtotal, billDiscount, taxable, totalCgst, totalSgst, totalIgst, totalGst, roundOff, total, gstByRate };
  })();

  const handleSave = async () => {
    if (!company) return alert('Please set up your company first');
    if (cart.length === 0) return alert('Add at least one item to the bill');
    const hasZeroQty = cart.some((c) => c.quantity <= 0);
    if (hasZeroQty) return alert('Item quantity must be at least 1');

    const payload = {
      company: company._id,
      partyId: partyId || undefined,
      items: cart.map((c) => ({
        itemId: c.itemId,
        name: c.name,
        hsn: c.hsn,
        unit: c.unit,
        quantity: c.quantity,
        price: c.price,
        mrp: c.mrp,
        gstRate: c.gstRate,
        gstIncluded: c.gstIncluded,
      })),
      discountType: billing.discountType,
      discountValue: Number(billing.discountValue) || 0,
      paymentMode: billing.paymentMode,
      paidAmount: Number(billing.paidAmount) > 0 ? Number(billing.paidAmount) : undefined,
      notes: billing.notes,
      salesPerson: billing.salesPerson,
    };

    setSaving(true);
    try {
      const res = await api.post('/invoices', payload);
      setSaving(false);
      navigate(`/invoices/${res.data._id}/print`);
    } catch (err) {
      setSaving(false);
      alert(err.response?.data?.message || 'Failed to save bill');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">New Bill</h2>
          <p className="text-sm text-gray-500">Create a GST invoice / bill</p>
        </div>
      </div>

      <SetupWarnings company={company} items={items} parties={parties} />

      {company && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Company *" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}{c.isGstRegistered ? ' (GST)' : ''}</option>
                  ))}
                </Select>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Party *</label>
                  <div className="flex gap-2">
                    <select
                      value={partyId}
                      onChange={(e) => setPartyId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Walk-in Customer</option>
                      {parties.map((p) => (
                        <option key={p._id} value={p._id}>{p.name}{p.gstin ? ' (GST)' : ''}</option>
                      ))}
                    </select>
                    <Button variant="secondary" onClick={() => navigate('/parties')} title="Add party">
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <SearchInput value={search} onChange={setSearch} placeholder="Search item by name / barcode..." />
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((it) => {
                      const inCart = cart.some((c) => c.itemId === it._id);
                      return (
                        <div key={it._id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-800 truncate">{it.name}</p>
                            <p className="text-xs text-gray-500">
                              <span className="text-indigo-600 font-medium">₹ {formatCurrency(it.salePrice)}</span>
                              <span className="mx-2">|</span>Stock: {it.stock} {it.unit}
                              {it.gstRate > 0 && <span className="mx-2">|</span>}<span>{it.gstRate}% GST{it.gstIncluded ? ' (incl.)' : ''}</span>
                            </p>
                          </div>
                          <Button variant={inCart ? 'secondary' : 'primary'} onClick={() => addToCart(it)} disabled={inCart}>
                            {inCart ? 'Added' : 'Add'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {search && searchResults.length === 0 && (
                  <p className="text-sm text-gray-400 py-2">No items match "{search}"</p>
                )}
              </div>
            </Card>

            <Card className="overflow-x-auto">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">Search and add items to build your bill</p>
                </div>
              ) : (
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                      <th className="py-3 px-4 font-medium">Item</th>
                      <th className="py-3 px-4 font-medium text-right">Price</th>
                      <th className="py-3 px-4 font-medium text-center">Qty</th>
                      <th className="py-3 px-4 font-medium text-right">Amount</th>
                      <th className="py-3 px-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((c) => (
                      <tr key={c.itemId} className="border-b border-gray-100">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-800">{c.name}</p>
                          {c.gstRate > 0 && <p className="text-xs text-gray-400">{c.gstRate}% GST</p>}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">₹ {formatCurrency(c.price)}</td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min="0"
                            value={c.quantity}
                            onChange={(e) => setQty(c.itemId, e.target.value)}
                            className="w-20 mx-auto block text-center px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-800">₹ {formatCurrency(c.quantity * c.price)}</td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => removeFromCart(c.itemId)} className="p-1.5 text-gray-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          <Card className="p-5 space-y-4 sticky top-20">
            <h3 className="font-semibold text-gray-800">Bill Summary</h3>

            <div className="grid grid-cols-2 gap-3">
              <Select label="Discount" value={billing.discountType} onChange={(e) => setBillField('discountType', e.target.value)}>
                <option value="amount">₹ Amount</option>
                <option value="percent">% Percent</option>
              </Select>
              <Input type="number" label="Value" value={billing.discountValue} onChange={(e) => setBillField('discountValue', e.target.value)} />
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹ {formatCurrency(totals.subtotal)}</span></div>
              {totals.billDiscount > 0 && (
                <div className="flex justify-between text-gray-600"><span>Discount</span><span>- ₹ {formatCurrency(totals.billDiscount)}</span></div>
              )}
              <div className="flex justify-between text-gray-600"><span>Taxable</span><span>₹ {formatCurrency(totals.taxable)}</span></div>
              {isGst && Object.entries(totals.gstByRate).map(([rate, gst]) => (
                <div key={rate} className="flex justify-between text-gray-600">
                  <span>{interstate ? 'IGST' : 'CGST+SGST'} @ {rate}%</span>
                  <span>₹ {formatCurrency(gst)}</span>
                </div>
              ))}
              <div className="flex justify-between text-gray-600"><span>Round Off</span><span>{totals.roundOff >= 0 ? '+' : ''} ₹ {formatCurrency(totals.roundOff)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-gray-200">
                <span>Total</span><span>₹ {formatCurrency(totals.total)}</span>
              </div>
              <p className="text-xs text-gray-500 pt-1">{amountToWords(totals.total)}</p>
            </div>

            <div className="space-y-3">
              <Select label="Payment Mode" value={billing.paymentMode} onChange={(e) => setBillField('paymentMode', e.target.value)}>
                {paymentModes.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </Select>
              <Input
                type="number"
                label="Amount Received"
                value={billing.paidAmount}
                onChange={(e) => setBillField('paidAmount', e.target.value)}
                placeholder={billing.paymentMode === 'credit' ? 'Amount paid (leave blank if none)' : 'Full amount'}
              />
              <Input label="Sales Person" value={billing.salesPerson} onChange={(e) => setBillField('salesPerson', e.target.value)} />
              <Input label="Notes" value={billing.notes} onChange={(e) => setBillField('notes', e.target.value)} placeholder="Optional" />
            </div>

            <Button onClick={handleSave} disabled={saving || cart.length === 0} className="w-full flex items-center justify-center">
              <Printer size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save Bill & Print'}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Billing;