import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';
import Payment from '../models/Payment.js';
import Purchase from '../models/Purchase.js';
import Item from '../models/Item.js';
import Party from '../models/Party.js';

const startOfDay = (d) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (d) => {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

export const getDashboard = async (req, res) => {
  try {
    const today = new Date();
    const weekStart = daysAgo(6);
    weekStart.setHours(0, 0, 0, 0);

    const [todayInvoices, todayPayments, todayExpenses, weekInvoices, allInvoices, allPurchases, allPayments, recentInvoices, lowStockItems] = await Promise.all([
      Invoice.find({ date: { $gte: startOfDay(today), $lte: endOfDay(today) }, invoiceType: 'sale' }),
      Payment.find({ date: { $gte: startOfDay(today), $lte: endOfDay(today) }, type: 'received' }),
      Expense.find({ expenseDate: { $gte: startOfDay(today), $lte: endOfDay(today) } }),
      Invoice.find({ date: { $gte: weekStart, $lte: endOfDay(today) }, invoiceType: 'sale' }),
      Invoice.find({ invoiceType: 'sale' }),
      Purchase.find({}),
      Payment.find({ type: 'received' }),
      Invoice.find({ invoiceType: 'sale' }).sort({ date: -1 }).limit(10).populate('party', 'name'),
      Item.find({ $expr: { $lte: ['$stock', '$lowStockAlert'] } }).sort({ stock: 1 }),
    ]);

    const totalSales = allInvoices.reduce((s, i) => s + i.total, 0);
    const todaySales = todayInvoices.reduce((s, i) => s + i.total, 0);
    const todayCollections = todayPayments.reduce((s, p) => s + p.amount, 0);
    const todayExpense = todayExpenses.reduce((s, e) => s + e.amount, 0);
    const totalExpense = allPurchases.reduce((s, p) => s + p.total, 0);
    const outstanding = allInvoices.reduce((s, i) => s + (i.dueAmount || 0), 0);
    const totalStockValue = {
      count: lowStockItems.length,
      items: lowStockItems.map((i) => ({ _id: i._id, name: i.name, stock: i.stock, lowStockAlert: i.lowStockAlert })),
    };

    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = daysAgo(i);
      const dayInvoices = weekInvoices.filter(
        (inv) => new Date(inv.date) >= startOfDay(d) && new Date(inv.date) <= endOfDay(d)
      );
      trend.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        sales: Math.round(dayInvoices.reduce((s, inv) => s + inv.total, 0)),
        count: dayInvoices.length,
      });
    }

    const itemSales = {};
    allInvoices.forEach((inv) => {
      inv.items.forEach((it) => {
        if (!it.name) return;
        const key = it.name;
        itemSales[key] = itemSales[key] || { name: it.name, quantity: 0, amount: 0 };
        itemSales[key].quantity += it.quantity;
        itemSales[key].amount += it.discountedAmount || it.amount;
      });
    });
    const topSelling = Object.values(itemSales).sort((a, b) => b.amount - a.amount).slice(0, 5);

    const last7 = daysAgo(6);
    const invoices7 = allInvoices.filter((inv) => new Date(inv.date) >= startOfDay(last7));
    const gstBreakdown = { 0: 0, 5: 0, 12: 0, 18: 0, 28: 0 };
    invoices7.forEach((inv) => {
      inv.items.forEach((it) => {
        const rate = it.gstRate;
        gstBreakdown[rate] = (gstBreakdown[rate] || 0) + (it.discountedAmount || it.amount);
      });
    });

    res.json({
      todaySales,
      todayInvoices: todayInvoices.length,
      todayCollections,
      todayExpense,
      totalSales,
      totalExpense,
      outstanding,
      avgInvoice: todayInvoices.length ? Math.round(todaySales / todayInvoices.length) : 0,
      stockValue: totalStockValue,
      trend,
      recentInvoices,
      topSelling,
      gstBreakdown,
      paymentModeSplit: {
        cash: allPayments.filter((p) => p.mode === 'cash').reduce((s, p) => s + p.amount, 0),
        upi: allPayments.filter((p) => p.mode === 'upi').reduce((s, p) => s + p.amount, 0),
        card: allPayments.filter((p) => p.mode === 'card').reduce((s, p) => s + p.amount, 0),
        bank: allPayments.filter((p) => p.mode === 'bank').reduce((s, p) => s + p.amount, 0),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};