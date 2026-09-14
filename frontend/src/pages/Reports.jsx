import React, { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import api from '../api/axios.js';
import { Card, Button, Input, Select, Spinner, EmptyState } from '../components/ui.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

const Alert = ({ children }) => (
  <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm">
    {children}
  </div>
);

const tabs = ['Sales Report', 'GST Summary', 'Stock Report', 'Profit & Loss', 'Party Statement', 'Day Book'];

const Reports = () => {
  const [tab, setTab] = useState('Sales Report');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [partyId, setPartyId] = useState('');
  const [bookDate, setBookDate] = useState(new Date().toISOString().slice(0, 10));

  const loadData = () => {
    setLoading(true);
    setData(null);
    setError('');
    let req;
    if (tab === 'Sales Report') req = api.get('/reports/sales', { params: { from, to } });
    else if (tab === 'GST Summary') req = api.get('/reports/gst', { params: { from, to } });
    else if (tab === 'Stock Report') req = api.get('/reports/stock');
    else if (tab === 'Profit & Loss') req = api.get('/reports/profit-loss', { params: { from, to } });
    else if (tab === 'Party Statement') req = api.get(`/reports/party-statement/${partyId}`);
    else req = api.get('/reports/day-book', { params: { date: bookDate } });
    req.then((res) => setData(res.data)).catch((err) => { setData(null); setError(err?.response?.data?.message || 'Failed to load report. Please try again.'); }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'Party Statement') {
      api.get('/parties').then((res) => setParties(res.data));
    }
  }, [tab]);

  useEffect(() => {
    if (!loading && (tab !== 'Party Statement' || partyId)) loadData();
  }, [tab, from, to, partyId, bookDate]);

  const print = () => window.print();

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Reports</h2>
          <p className="text-sm text-gray-500">Analytics & business summaries</p>
        </div>
        <Button variant="secondary" onClick={print}><Printer size={16} className="mr-1" /> Print</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {(tab === 'Sales Report' || tab === 'GST Summary' || tab === 'Profit & Loss') && (
        <div className="flex gap-3">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
        </div>
      )}
      {tab === 'Party Statement' && (
        <Select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="w-full sm:w-96">
          <option value="">Select party</option>
          {parties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </Select>
      )}
      {tab === 'Day Book' && (
        <Input type="date" value={bookDate} onChange={(e) => setBookDate(e.target.value)} className="w-44" />
      )}

      {tab === 'Party Statement' && !partyId && !loading && (
        <Alert>Warning: Select a party to view their statement.</Alert>
      )}
      {error && !loading && <Alert>Warning: {error}</Alert>}

      {loading && <Spinner />}

      {data && tab === 'Sales Report' && (data.invoices.length === 0 ? (
        <Card className="p-4"><EmptyState message="No sales found in the selected date range." /></Card>
      ) : (
        <Card className="overflow-x-auto p-4" id="print-area">
          <h3 className="font-bold text-gray-800 mb-4">Sales Report {from && to ? `(${from} to ${to})` : ''}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-indigo-50 rounded-lg p-3"><p className="text-xs text-gray-500">Total Bills</p><p className="font-bold">{data.count}</p></div>
            <div className="bg-indigo-50 rounded-lg p-3"><p className="text-xs text-gray-500">Total Sales</p><p className="font-bold">₹ {formatCurrency(data.total)}</p></div>
            <div className="bg-emerald-50 rounded-lg p-3"><p className="text-xs text-gray-500">Cash</p><p className="font-bold">₹ {formatCurrency(data.cash)}</p></div>
            <div className="bg-red-50 rounded-lg p-3"><p className="text-xs text-gray-500">Credit</p><p className="font-bold">₹ {formatCurrency(data.credit)}</p></div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3">Bill No</th><th className="py-2 pr-3">Party</th><th className="py-2 pr-3">Date</th><th className="py-2 pr-3 text-right">Total</th><th className="py-2 text-left">Mode</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((i) => (
                <tr key={i._id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-medium text-indigo-600">{i.billNumber}</td>
                  <td className="py-2 pr-3">{i.partySnapshot?.name || '-'}</td>
                  <td className="py-2 pr-3 text-gray-500">{formatDate(i.date)}</td>
                  <td className="py-2 pr-3 text-right font-medium">₹ {formatCurrency(i.total)}</td>
                  <td className="py-2 uppercase text-xs">{i.paymentMode}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </Card>
        ))}

      {data && tab === 'GST Summary' && (data.summary.length === 0 ? (
        <Card className="p-4"><EmptyState message="No GST data available in the selected date range." /></Card>
      ) : (
        <Card className="overflow-x-auto p-4">
          <h3 className="font-bold text-gray-800 mb-4">GST Summary</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3">GST Rate</th><th className="py-2 pr-3 text-right">Taxable Value</th><th className="py-2 pr-3 text-right">CGST</th><th className="py-2 pr-3 text-right">SGST</th><th className="py-2 pr-3 text-right">IGST</th><th className="py-2 text-right">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {data.summary.map((s) => (
                <tr key={s.rate} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-semibold">{s.rate}%</td>
                  <td className="py-2 pr-3 text-right">₹ {formatCurrency(s.taxable)}</td>
                  <td className="py-2 pr-3 text-right">₹ {formatCurrency(s.cgst)}</td>
                  <td className="py-2 pr-3 text-right">₹ {formatCurrency(s.sgst)}</td>
                  <td className="py-2 pr-3 text-right">₹ {formatCurrency(s.igst)}</td>
                  <td className="py-2 text-right font-semibold">₹ {formatCurrency(s.cgst + s.sgst + s.igst)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-bold">
                <td className="py-2 pr-3">Total</td>
                <td className="py-2 pr-3 text-right">₹ {formatCurrency(data.totalTaxable)}</td>
                <td className="py-2 pr-3 text-right" colSpan={3}></td>
                <td className="py-2 text-right">₹ {formatCurrency(data.totalTax)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
        ))}

      {data && tab === 'Stock Report' && (data.items.length === 0 ? (
        <Card className="p-4"><EmptyState message="No stock items found." /></Card>
      ) : (
        <Card className="overflow-x-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">Stock Report</h3>
            <p className="text-sm text-gray-600">Stock Value: <b>₹ {formatCurrency(data.totalValue)}</b></p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3">Item</th><th className="py-2 pr-3 text-right">Stock</th><th className="py-2 pr-3 text-right">Purchase Price</th><th className="py-2 pr-3 text-right">Sale Price</th><th className="py-2 text-right">Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i._id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-medium">{i.name}</td>
                  <td className="py-2 pr-3 text-right">{i.stock} {i.unit}</td>
                  <td className="py-2 pr-3 text-right">₹ {formatCurrency(i.purchasePrice)}</td>
                  <td className="py-2 pr-3 text-right">₹ {formatCurrency(i.salePrice)}</td>
                  <td className="py-2 text-right font-semibold">₹ {formatCurrency(i.stock * i.purchasePrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        ))}

      {data && tab === 'Profit & Loss' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="font-bold text-gray-800 mb-4">Income</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Sales</span><b>₹ {formatCurrency(data.saleTotal)}</b></div>
              <div className="flex justify-between text-gray-600"><span>Less: COGS</span><span>- ₹ {formatCurrency(data.cogs)}</span></div>
              <div className="flex justify-between pt-2 border-t border-gray-200"><span className="font-semibold">Gross Profit</span><b className={data.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>₹ {formatCurrency(data.grossProfit)}</b></div>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-bold text-gray-800 mb-4">Expenses</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Expenses</span><span>- ₹ {formatCurrency(data.expenseTotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Purchases (adds to stock)</span><span>₹ {formatCurrency(data.purchaseTotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Stock on hand</span><span>₹ {formatCurrency(data.stockOnHand)}</span></div>
              <div className="flex justify-between pt-2 border-t border-gray-200"><span className="font-semibold">Net Profit</span><b className={data.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>₹ {formatCurrency(data.netProfit)}</b></div>
            </div>
          </Card>
        </div>
      )}

      {data && tab === 'Party Statement' && (data.entries.length === 0 ? (
        <Card className="p-4"><EmptyState message="No transactions found for this party." /></Card>
      ) : (
        <Card className="overflow-x-auto p-4">
          <h3 className="font-bold text-gray-800 mb-1">{data.party.name}</h3>
          {data.party.shopName && <p className="text-sm text-gray-500 mb-4">{data.party.shopName}</p>}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Ref</th><th className="py-2 pr-3 text-right">Debit</th><th className="py-2 pr-3 text-right">Credit</th><th className="py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 pr-3 text-gray-500">{formatDate(e.date)}</td>
                  <td className="py-2 pr-3">{e.type}</td>
                  <td className="py-2 pr-3 text-gray-500">{e.ref}</td>
                  <td className="py-2 pr-3 text-right">{e.debit ? '₹ ' + formatCurrency(e.debit) : ''}</td>
                  <td className="py-2 pr-3 text-right">{e.credit ? '₹ ' + formatCurrency(e.credit) : ''}</td>
                  <td className={`py-2 text-right font-semibold ${e.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>₹ {formatCurrency(e.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        ))}

      {data && tab === 'Day Book' && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-bold text-gray-800 mb-3">Sales ({formatDate(bookDate)})</h3>
            {data.invoices.length === 0 ? <p className="text-sm text-gray-400">No sales</p> : (
              <table className="w-full text-sm">
                <tbody>
                  {data.invoices.map((i) => (
                    <tr key={i._id} className="border-b border-gray-100">
                      <td className="py-2 pr-3 text-indigo-600">{i.billNumber}</td>
                      <td className="py-2 pr-3">{i.party?.name || i.partySnapshot?.name || '-'}</td>
                      <td className="py-2 text-right font-medium">₹ {formatCurrency(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="font-bold text-gray-800 mb-3">Payments Received</h3>
            {data.payments.length === 0 ? <p className="text-sm text-gray-400">No payments</p> : (
              <table className="w-full text-sm">
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p._id} className="border-b border-gray-100">
                      <td className="py-2 pr-3">{p.party?.name}</td>
                      <td className="py-2 pr-3 uppercase text-xs text-gray-500">{p.mode}</td>
                      <td className="py-2 text-right font-medium text-emerald-600">₹ {formatCurrency(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="font-bold text-gray-800 mb-3">Expenses</h3>
            {data.expenses.length === 0 ? <p className="text-sm text-gray-400">No expenses</p> : (
              <table className="w-full text-sm">
                <tbody>
                  {data.expenses.map((e) => (
                    <tr key={e._id} className="border-b border-gray-100">
                      <td className="py-2 pr-3">{e.category}</td>
                      <td className="py-2 pr-3 text-gray-500">{e.note}</td>
                      <td className="py-2 text-right font-medium text-red-600">- ₹ {formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default Reports;