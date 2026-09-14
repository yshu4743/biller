import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';
import { Card, Button, Input, Select, Modal, EmptyState, Spinner, ErrorState } from '../components/ui.jsx';
import { getIndiaStates } from '../utils/format.js';
import { Building2, Pencil } from 'lucide-react';

const emptyForm = {
  name: '', gstin: '', isGstRegistered: false, gstBusinessType: 'regular', phone: '', email: '', address: '',
  city: '', state: '', stateCode: '', pincode: '', website: '', bankName: '',
  bankAccount: '', bankIfsc: '', upiId: '', invoicePrefix: 'INV', estimatePrefix: 'QTN', challanPrefix: 'DC', creditNotePrefix: 'CN', invoiceNote: '', invoiceFooter: '', logo: '',
  transactionLabels: { sale: 'TAX INVOICE', estimate: 'QUOTATION', challan: 'DELIVERY CHALLAN', sale_return: 'CREDIT NOTE' },
  invoiceColumns: ['hsn'],
  preventNegativeStock: false,
};

const businessTypeLabels = {
  regular: 'Regular taxpayer',
  composition: 'Composition dealer',
  sez: 'SEZ unit / SEZ developer',
  unregistered: 'Unregistered / consumer business',
};

const columnOptions = [
  { key: 'hsn', label: 'HSN Code' },
  { key: 'sku', label: 'SKU' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'mrp', label: 'MRP' },
  { key: 'discount', label: 'Discount' },
  { key: 'unit', label: 'Separate Unit column' },
];

const Company = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [gstCheck, setGstCheck] = useState(null);

  const load = () => api.get('/companies').then((res) => { setError(''); setCompanies(res.data); }).catch((err) => setError(err?.response?.data?.message || 'Failed to load company details.')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setGstCheck(null); setModalOpen(true); };
  const openEdit = (c) => {
    setEditingId(c._id);
    setGstCheck(null);
    setForm({ ...emptyForm, ...c, isGstRegistered: !!c.isGstRegistered, gstBusinessType: c.gstBusinessType || 'regular' });
    setModalOpen(true);
  };

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

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setLabel = (key, value) => setForm((f) => ({ ...f, transactionLabels: { ...f.transactionLabels, [key]: value } }));
  const toggleColumn = (key) => setForm((f) => ({
    ...f,
    invoiceColumns: f.invoiceColumns.includes(key) ? f.invoiceColumns.filter((c) => c !== key) : [...f.invoiceColumns, key],
  }));

  const onStateChange = (name) => {
    const state = getIndiaStates().find((s) => s.name === name);
    set('state', name);
    set('stateCode', state ? String(state.code) : '');
  };

  const onLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => set('logo', reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await api.put(`/companies/${editingId}`, form);
      } else {
        await api.post('/companies', form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {error && <ErrorState message={error} />}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Company Details</h2>
          <p className="text-sm text-gray-500">Your business information used on invoices</p>
        </div>
        <Button onClick={openCreate}>Add Company</Button>
      </div>

      {companies.length === 0 ? (
        <Card className="p-8">
          <EmptyState message="No company added yet. Add your company to start billing." />
          <div className="text-center">
            <Button onClick={openCreate}>Add Your Company</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {companies.map((c) => (
            <Card key={c._id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {c.logo ? (
                    <img src={c.logo} alt="logo" className="h-16 w-16 rounded-lg object-contain border border-gray-200 bg-white" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Building2 size={28} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{c.name}</h3>
                    <p className="text-sm text-gray-500">{c.address}, {c.city} - {c.pincode}</p>
                    <p className="text-sm text-gray-500">{c.city && c.state ? `${c.state}` : ''} {c.isGstRegistered ? `| GSTIN: ${c.gstin}` : '(Non-GST)'}</p>
                    {c.isGstRegistered && <p className="text-xs text-gray-400">{businessTypeLabels[c.gstBusinessType] || 'Regular taxpayer'}</p>}
                  </div>
                </div>
                <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-indigo-600 p-1">
                  <Pencil size={18} />
                </button>
              </div>
              <div className="border-t border-gray-100 mt-4 pt-4 grid grid-cols-2 gap-3 text-sm">
                <p><span className="text-gray-500">Phone:</span> {c.phone || '-'}</p>
                <p><span className="text-gray-500">Email:</span> {c.email || '-'}</p>
                <p><span className="text-gray-500">Invoice Prefix:</span> {c.invoicePrefix}</p>
                <p><span className="text-gray-500">UPI ID:</span> {c.upiId || '-'}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Company' : 'Add Company'} maxWidth="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Company Name *" value={form.name} onChange={(e) => set('name', e.target.value)} className="col-span-2" />
          <div className="col-span-2 flex items-center gap-3">
            <Input type="checkbox" checked={form.isGstRegistered} onChange={(e) => set('isGstRegistered', e.target.checked)} className="w-4 h-4" label="" />
            <span className="text-sm text-gray-700">GST Registered Business</span>
          </div>
          <div className="col-span-2 flex items-end gap-2">
            <div className="flex-1">
              <Input label="GSTIN" value={form.gstin} onChange={(e) => set('gstin', e.target.value)} placeholder="27ABCDE1234F1Z5" />
              {gstCheck && (
                <div className={`text-xs mt-1 ${gstCheck.valid ? 'text-emerald-600' : 'text-red-600'}`}>
                  {gstCheck.valid ? '✓ Valid GSTIN' : `✗ ${gstCheck.errors.join('; ')}`}
                  {gstCheck.breakdown?.stateName && <span className="text-gray-500"> — State: {gstCheck.breakdown.stateName} · PAN: {gstCheck.breakdown.pan}</span>}
                </div>
              )}
            </div>
            <Button variant="secondary" onClick={verifyGstin}>Verify</Button>
          </div>
          <Select label="GST Business Type" value={form.gstBusinessType} onChange={(e) => set('gstBusinessType', e.target.value)}>
            {Object.entries(businessTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input label="Invoice Prefix" value={form.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value)} placeholder="INV" />
          <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <Input label="Email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} className="col-span-2" />
          <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <Input label="Pincode" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} />
          <Select label="State" value={form.state} onChange={(e) => onStateChange(e.target.value)} className="col-span-2">
            <option value="">Select State</option>
            {getIndiaStates().map((s) => <option key={s.code} value={s.name}>{s.name}</option>)}
          </Select>
          <Input label="Website" value={form.website} onChange={(e) => set('website', e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
            <input type="file" accept="image/*" onChange={onLogoUpload} className="text-sm" />
          </div>
          <Input label="UPI ID (for QR on bill)" value={form.upiId} onChange={(e) => set('upiId', e.target.value)} />
          <Input label="Bank Name" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
          <Input label="Account Number" value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} />
          <Input label="IFSC Code" value={form.bankIfsc} onChange={(e) => set('bankIfsc', e.target.value)} />
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Note</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={form.invoiceNote} onChange={(e) => set('invoiceNote', e.target.value)} placeholder="Thank you for your business!" />
          </div>
          <div className="col-span-2 border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Transaction Names (printed on documents)</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Sale Invoice heading" value={form.transactionLabels.sale} onChange={(e) => setLabel('sale', e.target.value)} />
              <Input label="Estimate heading" value={form.transactionLabels.estimate} onChange={(e) => setLabel('estimate', e.target.value)} />
              <Input label="Challan heading" value={form.transactionLabels.challan} onChange={(e) => setLabel('challan', e.target.value)} />
              <Input label="Credit Note heading" value={form.transactionLabels.sale_return} onChange={(e) => setLabel('sale_return', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <Input label="Invoice prefix" value={form.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value)} placeholder="INV" />
              <Input label="Quotation prefix" value={form.estimatePrefix} onChange={(e) => set('estimatePrefix', e.target.value)} placeholder="QTN" />
              <Input label="Challan prefix" value={form.challanPrefix} onChange={(e) => set('challanPrefix', e.target.value)} placeholder="DC" />
              <Input label="Credit Note prefix" value={form.creditNotePrefix} onChange={(e) => set('creditNotePrefix', e.target.value)} placeholder="CN" />
            </div>
          </div>
          <div className="col-span-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Item Table Columns on Invoice</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {columnOptions.map((col) => (
                <label key={col.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.invoiceColumns.includes(col.key)} onChange={() => toggleColumn(col.key)} className="h-4 w-4" />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
          <div className="col-span-2 border-t border-gray-200 pt-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.preventNegativeStock} onChange={(e) => set('preventNegativeStock', e.target.checked)} className="h-4 w-4" />
              Block billing when stock is insufficient (never go negative)
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{editingId ? 'Update' : 'Save'}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Company;