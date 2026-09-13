import Payment from '../models/Payment.js';
import Party from '../models/Party.js';
import Invoice from '../models/Invoice.js';
import Purchase from '../models/Purchase.js';

export const listPayments = async (req, res) => {
  try {
    const { from, to, type, partyId } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to + 'T23:59:59');
    }
    if (type) filter.type = type;
    if (partyId) filter.party = partyId;
    const payments = await Payment.find(filter).populate('party', 'name gstin').populate('invoice', 'billNumber total').populate('purchase', 'purchaseBillNumber total').sort({ date: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createPayment = async (req, res) => {
  try {
    const { party, type, amount, mode, date, invoice, purchase, reference, note } = req.body;
    if (!party || !type || !amount) return res.status(400).json({ message: 'Party, type and amount are required' });
    const payment = await Payment.create({
      party,
      type,
      amount: Number(amount),
      mode: mode || 'cash',
      date: date || Date.now(),
      invoice,
      purchase,
      reference: reference || '',
      note: note || '',
      createdBy: req.user._id,
    });

    if (invoice) {
      const inv = await Invoice.findById(invoice);
      if (inv) {
        if (type === 'received') {
          inv.paidAmount = Math.min(inv.total, inv.paidAmount + Number(amount));
        }
        inv.status = inv.paidAmount >= inv.total ? 'paid' : inv.paidAmount > 0 ? 'partial' : 'unpaid';
        inv.dueAmount = inv.total - inv.paidAmount;
        await inv.save();
      }
    }
    if (purchase) {
      const pur = await Purchase.findById(purchase);
      if (pur && type === 'paid') {
        pur.paidAmount = Math.min(pur.total, pur.paidAmount + Number(amount));
        pur.status = pur.paidAmount >= pur.total ? 'paid' : pur.paidAmount > 0 ? 'partial' : 'unpaid';
        pur.dueAmount = pur.total - pur.paidAmount;
        await pur.save();
      }
    }

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.invoice && payment.type === 'received') {
      const inv = await Invoice.findById(payment.invoice);
      if (inv) {
        inv.paidAmount = Math.max(0, inv.paidAmount - payment.amount);
        inv.status = inv.paidAmount >= inv.total ? 'paid' : inv.paidAmount > 0 ? 'partial' : 'unpaid';
        inv.dueAmount = inv.total - inv.paidAmount;
        await inv.save();
      }
    }
    if (payment.purchase && payment.type === 'paid') {
      const pur = await Purchase.findById(payment.purchase);
      if (pur) {
        pur.paidAmount = Math.max(0, pur.paidAmount - payment.amount);
        pur.status = pur.paidAmount >= pur.total ? 'paid' : pur.paidAmount > 0 ? 'partial' : 'unpaid';
        pur.dueAmount = pur.total - pur.paidAmount;
        await pur.save();
      }
    }
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const partyOutstanding = async (req, res) => {
  try {
    const parties = await Party.find({ isActive: true, partyType: { $ne: 'supplier' } });
    const result = [];
    for (const party of parties) {
      const invoices = await Invoice.find({ party: party._id });
      let totalDue = party.openingBalance * (party.balanceType === 'debit' ? 1 : -1);
      invoices.forEach((inv) => {
        if (inv.invoiceType !== 'sale_return') totalDue += inv.dueAmount;
        else totalDue -= inv.total;
      });
      result.push({ party, due: totalDue });
    }
    const filtered = result.filter((r) => r.due > 0 || Math.abs(r.due) < 0.001 ? true : false).sort((a, b) => b.due - a.due);
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};