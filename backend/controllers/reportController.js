import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';
import Purchase from '../models/Purchase.js';
import Payment from '../models/Payment.js';
import Item from '../models/Item.js';
import Party from '../models/Party.js';
import Company from '../models/Company.js';

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
    const [purchases, returns] = await Promise.all([
      Purchase.find({ type: 'purchase', ...dateRange(from, to) }).populate('party', 'name'),
      Purchase.find({ type: 'purchase_return', ...dateRange(from, to) }).populate('party', 'name'),
    ]);
    const total = purchases.reduce((s, p) => s + p.total, 0);
    const returned = returns.reduce((s, p) => s + p.total, 0);
    res.json({
      count: purchases.length,
      total,
      returned,
      netTotal: total - returned,
      purchases,
      returns,
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
    const purchases = await Purchase.find({ type: 'purchase', ...dateRange(from, to) });
    const purchaseTotal = purchases.reduce((s, p) => s + p.total, 0);
    const purchaseReturns = await Purchase.find({ type: 'purchase_return', ...dateRange(from, to) });
    const purchaseReturnTotal = purchaseReturns.reduce((s, p) => s + p.total, 0);

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
    cogs = openingStock + (purchaseTotal - purchaseReturnTotal) - stockOnHand;

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

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const cleanHsn = (code) => (code || '').replace(/\D/g, '').slice(0, 8) || '0000';

function gstSplit(amount, rate, intra) {
  const g = (amount * rate) / 100;
  const igst = intra ? 0 : g;
  const half = intra ? g / 2 : 0;
  return { iamt: r2(igst), camt: r2(half), samt: r2(half), csamt: 0 };
}

export const gstr1Export = async (req, res) => {
  try {
    const { from, to } = req.query;
    const [invoices, companies] = await Promise.all([
      Invoice.find({ invoiceType: 'sale', ...dateRange(from, to) }).sort({ date: 1 }),
      Company.find({}).sort({ createdAt: 1 }),
    ]);
    const company = companies[0] || null;
    const b2b = [], b2cs = [], exp = [];
    const hsnd = {};
    let fpYear = null;
    let fpMonth = null;

    invoices.forEach((inv) => {
      const d = new Date(inv.date);
      fpMonth = fpMonth || String(d.getMonth() + 1).padStart(2, '0') + String(d.getFullYear());
      fpYear = fpYear || String(d.getFullYear());
      const partyGst = inv.partySnapshot?.gstin || '';
      const stateCode = inv.partySnapshot?.stateCode || '';
      const isExport = /^9[6-9]$/.test(stateCode);
      const pos = stateCode && stateCode.length === 2 ? stateCode : '';
      const doc = { typ: 'INV', no: inv.billNumber, dt: d.toISOString().slice(0, 10) };
      const itms = (inv.items || []).map((it, i) => {
        const rt = Number(it.gstRate) || 0;
        const amt = it.discountedAmount || it.amount;
        const txval = it.gstIncluded && rt > 0 ? amt / (1 + rt / 100) : amt;
        const hasPos = !!pos;
        const split = gstSplit(txval, rt, hasPos && !isExport);
        return { num: i + 1, itm_det: { txval: r2(txval), rt, ...split }, ...(it.hsn ? { hsn_sc: cleanHsn(it.hsn) } : {}) };
      });
      const einv_irn = inv.eInvoice?.irn || '';

      if (isExport) {
        exp.push({ exh_typ: einv_irn ? 'S' : 'WPAY', einv_irn, sply_ty: 'EXP', inv, doc, itms });
      } else if (partyGst) {
        b2b.push({ gstin: partyGst, pos, doc, itms, einv_irn });
      } else {
        b2cs.push({ sply_ty: pos ? 'INTRA' : 'INTER', pos: pos || '99-OTHER', typ: 'OE', doc, itms });
      }

      (inv.items || []).forEach((it) => {
        const rt = Number(it.gstRate) || 0;
        const amt = it.discountedAmount || it.amount;
        const txval = it.gstIncluded && rt > 0 ? amt / (1 + rt / 100) : amt;
        const hsn = cleanHsn(it.hsn);
        hsnd[hsn] = hsnd[hsn] || { hsn_sc: hsn, desc: it.name || '', uqc: (it.unit || 'NOS').toUpperCase(), qty: 0, val: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
        const e = hsnd[hsn];
        const split = gstSplit(txval, rt, isExport ? false : !!pos);
        e.qty += Number(it.quantity) || 0;
        e.val += r2(amt);
        e.txval += r2(txval);
        e.iamt += split.iamt;
        e.camt += split.camt;
        e.samt += split.samt;
      });
    });

    const payload = {
      version: 'GST3.1.1',
      hash: '',
      gstin: company?.gstin || null,
      legalName: company?.name || '',
      tradNam: company?.name || '',
      fy: fpYear,
      fp: fpMonth,
      ...(b2b.length ? { b2b } : {}),
      ...(b2cs.length ? { b2cs } : {}),
      ...(exp.length ? { exp: { exp } } : {}),
      ...(Object.keys(hsnd).length ? { hsnd: Object.values(hsnd) } : {}),
    };

    res.json({
      payload,
      counts: { b2b: b2b.length, b2cs: b2cs.length, exports: exp.length, hsn: Object.keys(hsnd).length },
      period: { from: from || null, to: to || null },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const gstr3b = async (req, res) => {
  try {
    const { from, to } = req.query;
    const range = dateRange(from, to);
    const [invoices, purchases] = await Promise.all([
      Invoice.find({ invoiceType: 'sale', ...range }),
      Purchase.find(range),
    ]);

    const sec31a = { txval: 0, iamt: 0, camt: 0, samt: 0 };
    const sec31b = { sup_for_dupay: { txval: 0, iamt: 0 }, exp_supplier: { txval: 0, iamt: 0 } };
    let exemptValue = 0; // 3.1(c) nil/exempt/non-GST outward supplies
    let intraCount = 0, interCount = 0;

    invoices.forEach((inv) => {
      const isExport = /^9[6-9]$/.test(inv.partySnapshot?.stateCode || '');
      const exemption = inv.taxable === 0 && inv.total === 0 && inv.totalGst === 0;
      if (isExport) {
        sec31b.sup_for_dupay.txval += r2(inv.taxable);
        sec31b.sup_for_dupay.iamt += r2(inv.igst);
      } else if (exemption) {
        exemptValue += r2(inv.taxable);
      } else {
        sec31a.txval += r2(inv.taxable);
        sec31a.iamt += r2(inv.igst);
        sec31a.camt += r2(inv.cgst);
        sec31a.samt += r2(inv.sgst);
        if (inv.igst > 0) interCount += 1; else intraCount += 1;
      }
    });

    // Input tax credit: purchases, treated as IGST when supplier state is unknown.
    let itcIgst = 0, itcCgst = 0, itcSgst = 0;
    purchases.forEach((p) => {
      p.items.forEach((it) => {
        const rt = Number(it.gstRate) || 0;
        const g = (Number(it.amount) || 0) * rt / 100;
        itcIgst += r2(g);
      });
    });

    const totalOutward = sec31a.txval + sec31b.sup_for_dupay.txval;
    const sec6 = {
      interState: r2(sec31a.iamt),
      intraState: r2(sec31a.camt + sec31a.samt),
      totalTax: r2(sec31a.iamt + sec31a.camt + sec31a.samt),
      lateFees: 0,
    };

    res.json({
      period: { from: from || null, to: to || null },
      sections: {
        s3_1: {
          a: sec31a,
          b: sec31b,
          c: { txval: r2(exemptValue) },
          note: '3.1(b) - exports (zero rated); 3.1(c) - exempt/nil-rated/non-GST supplies',
        },
        s4: {
          ITC_available: { iamt: r2(itcIgst), camt: r2(itcCgst), samt: r2(itcSgst) },
          note: 'Input ITC computed from purchases. Shown as IGST when supplier state is not recorded; adjust for CGST/SGST split if needed.',
        },
        s5: { value: r2(totalOutward), note: '5.1 - exempt, nil-rated and non-GST outward supplies' },
        s6: sec6,
      },
      totals: {
        invoices: invoices.length,
        purchases: purchases.length,
        intraCount,
        interCount,
        outstandingGst: sec6.totalTax,
        totalItc: r2(itcIgst + itcCgst + itcSgst),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};