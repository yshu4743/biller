import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';
import Purchase from '../models/Purchase.js';
import Payment from '../models/Payment.js';
import Item from '../models/Item.js';
import Party from '../models/Party.js';

const dateRange = (from, to) => {
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to + 'T23:59:59');
  }
  return filter;
};

export const salesReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const invoices = await Invoice.find({ invoiceType: 'sale', ...dateRange(from, to) }).populate('party', 'name shopName');
    const total = invoices.reduce((s, i) => s + i.total, 0);
    const cash = invoices.filter((i) => i.paymentMode === 'cash').reduce((s, i) => s + i.total, 0);
    const credit = invoices.filter((i) => i.status !== 'paid' && i.paymentMode !== 'cash').reduce((s, i) => s + i.total, 0);
    res.json({
      count: invoices.length,
      total,
      cash,
      credit,
      totalGst: invoices.reduce((s, i) => s + i.totalGst, 0),
      invoices,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const gstReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const invoices = await Invoice.find({ invoiceType: 'sale', ...dateRange(from, to) });
    const summary = {};
    invoices.forEach((inv) => {
      inv.items.forEach((it) => {
        const rate = it.gstRate || 0;
        const key = `${rate}%`;
        summary[key] = summary[key] || {
          rate,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          count: 0,
        };
        const taxable = it.gstIncluded ? (it.discountedAmount || it.amount) / (1 + rate / 100) : it.discountedAmount || it.amount;
        const gst = (taxable * rate) / 100;
        summary[key].taxable += taxable;
        if (inv.cgst > 0) {
          summary[key].cgst += gst / 2;
          summary[key].sgst += gst / 2;
        } else {
          summary[key].igst += gst;
        }
        summary[key].count += 1;
      });
    });
    res.json({
      summary: Object.values(summary).sort((a, b) => a.rate - b.rate),
      totalTaxable: Object.values(summary).reduce((s, r) => s + r.taxable, 0),
      totalTax: Object.values(summary).reduce((s, r) => s + r.cgst + r.sgst + r.igst, 0),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const purchaseReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const purchases = await Purchase.find(dateRange(from, to)).populate('party', 'name');
    res.json({
      count: purchases.length,
      total: purchases.reduce((s, p) => s + p.total, 0),
      purchases,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const stockReport = async (req, res) => {
  try {
    const items = await Item.find({ isService: false }).sort({ stock: 1 });
    const totalValue = items.reduce((s, i) => s + i.stock * i.purchasePrice, 0);
    res.json({ items, totalValue });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const profitLoss = async (req, res) => {
  try {
    const { from, to } = req.query;
    const sales = await Invoice.find({ invoiceType: 'sale', ...dateRange(from, to) });
    const saleTotal = sales.reduce((s, i) => s + i.total, 0);
    const expenses = await Expense.find({ ...(from || to ? { expenseDate: { $gte: from ? new Date(from) : undefined, $lte: to ? new Date(to + 'T23:59:59') : undefined } } : {}) });
    const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const purchases = await Purchase.find(dateRange(from, to));
    const purchaseTotal = purchases.reduce((s, p) => s + p.total, 0);

    let cogs = 0;
    let salesItemTotal = 0;
    sales.forEach((inv) => {
      inv.items.forEach((it) => {
        salesItemTotal += it.discountedAmount || it.amount;
      });
    });
    const items = await Item.find({});
    const stockOnHand = items.reduce((s, i) => s + i.stock * (i.purchasePrice || 0), 0);
    const openingStock = items.reduce((s, i) => s + i.openingStock * (i.purchasePrice || 0), 0);
    cogs = openingStock + purchaseTotal - stockOnHand;

    const grossProfit = saleTotal - cogs;
    const netProfit = grossProfit - expenseTotal;

    res.json({
      saleTotal,
      purchaseTotal,
      expenseTotal,
      cogs,
      grossProfit,
      netProfit,
      stockOnHand,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const partyStatement = async (req, res) => {
  try {
    const { id } = req.params;
    const party = await Party.findById(id);
    if (!party) return res.status(404).json({ message: 'Party not found' });
    const [invoices, payments, purchases] = await Promise.all([
      Invoice.find({ party: id }).sort({ date: 1 }),
      Payment.find({ party: id }).sort({ date: 1 }),
      Purchase.find({ party: id }).sort({ date: 1 }),
    ]);
    let balance = party.openingBalance * (party.balanceType === 'debit' ? 1 : -1);
    const entries = [];
    if (party.openingBalance) {
      entries.push({ date: party.createdAt, type: 'Opening Balance', ref: 'Opening', debit: party.balanceType === 'debit' ? party.openingBalance : 0, credit: party.balanceType === 'credit' ? party.openingBalance : 0, balance });
    }
    invoices.forEach((inv) => {
      if (inv.invoiceType === 'sale') {
        balance += inv.total;
        entries.push({ date: inv.date, type: 'Sale', ref: inv.billNumber, debit: inv.total, credit: 0, balance });
      } else if (inv.invoiceType === 'sale_return') {
        balance -= inv.total;
        entries.push({ date: inv.date, type: 'Sale Return', ref: inv.billNumber, debit: 0, credit: inv.total, balance });
      }
    });
    purchases.forEach((pp) => {
      if (party.partyType === 'supplier' || party.partyType === 'both') {
        balance -= pp.total;
        entries.push({ date: pp.date, type: 'Purchase', ref: pp.purchaseBillNumber, debit: 0, credit: pp.total, balance });
      }
    });
    payments.forEach((pm) => {
      if (pm.type === 'received') {
        balance -= pm.amount;
        entries.push({ date: pm.date, type: 'Payment Received', ref: pm.reference, debit: 0, credit: pm.amount, balance });
      } else {
        balance += pm.amount;
        entries.push({ date: pm.date, type: 'Payment Made', ref: pm.reference, debit: pm.amount, credit: 0, balance });
      }
    });
    res.json({ party, entries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const gstr1Summary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const invoices = await Invoice.find({ invoiceType: 'sale', ...dateRange(from, to) });
    const buckets = { b2b: { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, value: 0 }, b2cSmall: { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, value: 0 }, b2cLarge: { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, value: 0 }, exports: { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, value: 0 } };
    let einvoiceCount = 0;
    let ewayBillGenerated = 0;
    let ewayBillRequired = 0;

    const addTo = (b, inv) => {
      b.count += 1;
      b.taxable += inv.taxable || 0;
      b.cgst += inv.cgst || 0;
      b.sgst += inv.sgst || 0;
      b.igst += inv.igst || 0;
      b.value += inv.total || 0;
    };

    invoices.forEach((inv) => {
      const partyGst = inv.partySnapshot?.gstin;
      const dest = inv.partySnapshot?.stateCode || '';
      if (/^9[6-9]$/.test(dest)) addTo(buckets.exports, inv);
      else if (partyGst) addTo(buckets.b2b, inv);
      else if (inv.total >= 250000) addTo(buckets.b2cLarge, inv);
      else addTo(buckets.b2cSmall, inv);
      if (inv.eInvoice?.irn) einvoiceCount += 1;
      if (inv.eWayBill?.no) ewayBillGenerated += 1;
      if (inv.eWayBill?.thresholdMet || inv.total > 50000) ewayBillRequired += 1;
    });

    const total = {
      count: invoices.length,
      taxable: invoices.reduce((s, i) => s + (i.taxable || 0), 0),
      cgst: invoices.reduce((s, i) => s + (i.cgst || 0), 0),
      sgst: invoices.reduce((s, i) => s + (i.sgst || 0), 0),
      igst: invoices.reduce((s, i) => s + (i.igst || 0), 0),
    };
    total.totalTax = total.cgst + total.sgst + total.igst;

    res.json({
      period: { from: from || null, to: to || null },
      buckets,
      total,
      compliance: { einvoiceCount, ewayBillGenerated, ewayBillRequired },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const dayBook = async (req, res) => {
  try {
    const { date } = req.query;
    const d = date ? new Date(date) : new Date();
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    const [invoices, payments, expenses, purchases] = await Promise.all([
      Invoice.find({ date: { $gte: start, $lte: end } }).populate('party', 'name'),
      Payment.find({ date: { $gte: start, $lte: end } }).populate('party', 'name'),
      Expense.find({ expenseDate: { $gte: start, $lte: end } }),
      Purchase.find({ date: { $gte: start, $lte: end } }).populate('party', 'name'),
    ]);
    res.json({ invoices, payments, expenses, purchases });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};