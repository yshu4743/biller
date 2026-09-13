import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IndianRupee, Receipt, ArrowDownCircle, AlertTriangle, TrendingUp, Wallet } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/axios.js';
import { Card, StatCard, Spinner, Badge } from '../components/ui.jsx';
import { formatCurrency } from '../utils/format.js';

const Dashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then((res) => setData(res.data)).catch(() => setData(null));
  }, []);

  if (!data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Today's Sales" value={'₹ ' + formatCurrency(data.todaySales)} icon={<IndianRupee size={22} />} color="indigo" />
        <StatCard title="Today's Bills" value={data.todayInvoices} icon={<Receipt size={22} />} color="blue" />
        <StatCard title="Today Collection" value={'₹ ' + formatCurrency(data.todayCollections)} icon={<ArrowDownCircle size={22} />} color="green" />
        <StatCard title="Today Expense" value={'₹ ' + formatCurrency(data.todayExpense)} icon={<Wallet size={22} />} color="yellow" />
        <StatCard title="Total Sales" value={'₹ ' + formatCurrency(data.totalSales)} icon={<TrendingUp size={22} />} color="purple" />
        <StatCard title="Outstanding Dues" value={'₹ ' + formatCurrency(data.outstanding)} icon={<AlertTriangle size={22} />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Sales Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.trend}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={(v) => formatCurrency(v, 0)} />
              <Tooltip formatter={(v) => ['₹ ' + formatCurrency(v), 'Sales']} />
              <Area type="monotone" dataKey="sales" stroke="#4f46e5" fill="url(#salesGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Low Stock Alerts</h3>
          {data.stockValue.items.length === 0 ? (
            <p className="text-sm text-gray-400">All items are in stock</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.stockValue.items.map((item) => (
                <Link to="/items" key={item._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">Alert at {item.lowStockAlert}</p>
                  </div>
                  <Badge color="red">{item.stock} left</Badge>
                </Link>
              ))}
            </div>
          )}
          <div className="border-t border-gray-100 mt-4 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">GST Slab Distribution (7 days)</h4>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={Object.entries(data.gstBreakdown).map(([rate, value]) => ({ rate: rate + '%', value }))}>
                <XAxis dataKey="rate" stroke="#9ca3af" fontSize={11} />
                <YAxis hide />
                <Tooltip formatter={(v) => ['₹ ' + formatCurrency(v), 'Value']} />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Recent Invoices</h3>
            <Link to="/invoices" className="text-sm text-indigo-600 hover:text-indigo-800">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4 font-medium">Bill No</th>
                  <th className="py-2 pr-4 font-medium">Party</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentInvoices.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-400">No invoices yet</td></tr>
                )}
                {data.recentInvoices.map((inv) => (
                  <tr key={inv._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-indigo-600">{inv.billNumber}</td>
                    <td className="py-2.5 pr-4">{inv.partySnapshot?.name || inv.party?.name || '-'}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                    <td className="py-2.5 pr-4 font-medium">₹ {formatCurrency(inv.total)}</td>
                    <td className="py-2.5">
                      <Badge color={inv.status === 'paid' ? 'green' : inv.status === 'partial' ? 'yellow' : 'red'}>{inv.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Top Selling Items</h3>
          {data.topSelling.length === 0 ? (
            <p className="text-sm text-gray-400">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topSelling.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.quantity} units</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">₹ {formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;