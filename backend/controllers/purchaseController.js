import Purchase from '../models/Purchase.js';
import Item from '../models/Item.js';
import Company from '../models/Company.js';
import BillCounter from '../models/BillCounter.js';
import Party from '../models/Party.js';
import { auditFromReq } from '../utils/audit.js';

async function generatePurchaseBillNumber(companyId, prefix = 'PUR') {
  const fy = new Date().getFullYear();
  const fyStr = fy.toString().slice(-2) + (fy + 1).toString().slice(-2);
  const counter = await BillCounter.findOneAndUpdate(
    { company: companyId, prefix, year: fyStr },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${fyStr}-${String(counter.sequence).padStart(4, '0')}`;
}

export const createPurchase = async (req, res) => {
  try {
    const { company: companyId, partyId, items, paymentMode, paidAmount, notes, discountValue, discountType } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ message: 'No items in purchase' });

    const company = await Company.findById(companyId);
    const companyIsGst = company && company.isGstRegistered;

    let subtotal = 0;
    let totalGst = 0;
    const purchaseItems = [];

    for (const entry of items) {
      const itemDoc = await Item.findById(entry.itemId);
      const qty = Number(entry.quantity) || 1;
      const price = Number(entry.price) || (itemDoc ? itemDoc.purchasePrice : 0);
      const gstRate = Number(entry.gstRate !== undefined ? entry.gstRate : (itemDoc ? itemDoc.gstRate : 0));
      const amount = qty * price;
      subtotal += amount;
      const taxable = amount;
      totalGst += (taxable * gstRate) / 100;
      purchaseItems.push({
        item: itemDoc ? itemDoc._id : null,
        name: entry.name || (itemDoc ? itemDoc.name : ''),
        hsn: entry.hsn || (itemDoc ? itemDoc.hsn : ''),
        unit: entry.unit || (itemDoc ? itemDoc.unit : 'pcs'),
        quantity: qty,
        price,
        gstRate,
        amount,
      });
      if (itemDoc) {
        itemDoc.purchasePrice = price || itemDoc.purchasePrice;
        itemDoc.stock += qty;
        await itemDoc.save();
      }
    }

    const discountAmount = discountValue ? (discountType === 'percent' ? (subtotal * discountValue) / 100 : discountValue) : 0;
    const taxable = subtotal - discountAmount;
    const total = Math.round((taxable + totalGst) * 100) / 100;

    const purchaseBillNumber = await generatePurchaseBillNumber(companyId);

    const purchase = await Purchase.create({
      purchaseBillNumber,
      company: companyId,
      party: partyId,
      partySnapshot: partyId ? (await Party.findById(partyId)).name : undefined,
      items: purchaseItems,
      subtotal,
      discountType: discountType || 'amount',
      discountValue: discountValue || 0,
      discountAmount,
      taxable,
      totalGst: Math.round(totalGst * 100) / 100,
      total,
      paymentMode: paymentMode || 'credit',
      paidAmount: paidAmount || 0,
      status: paidAmount >= total ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
      dueAmount: total - (paidAmount || 0),
      notes: notes || '',
      createdBy: req.user._id,
    });

    await auditFromReq(req, 'create', 'purchase', purchase._id.toString(), purchase.purchaseBillNumber, { total: purchase.total, items: purchase.items.length });
    res.status(201).json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createPurchaseReturn = async (req, res) => {
  try {
    const source = await Purchase.findById(req.params.id);
    if (!source) return res.status(404).json({ message: 'Purchase not found' });
    if (source.type === 'purchase_return') return res.status(400).json({ message: 'A return is already recorded for this purchase' });
    if (!source.items || source.items.length === 0) return res.status(400).json({ message: 'Cannot return a purchase with no items' });

    const purchaseBillNumber = await generatePurchaseBillNumber(source.company, 'PRT');
    const ret = await Purchase.create({
      purchaseBillNumber,
      company: source.company,
      party: source.party,
      partySnapshot: source.partySnapshot,
      items: source.items.map((it) => it.toObject()),
      subtotal: source.subtotal,
      discountType: source.discountType,
      discountValue: source.discountValue,
      discountAmount: source.discountAmount,
      taxable: source.taxable,
      totalGst: source.totalGst,
      total: source.total,
      paymentMode: source.paymentMode,
      paidAmount: 0,
      status: 'unpaid',
      dueAmount: 0,
      notes: source.notes ? `Return of ${source.purchaseBillNumber} — ${source.notes}` : `Return of ${source.purchaseBillNumber}`,
      type: 'purchase_return',
      returnedOf: source._id,
      createdBy: req.user._id,
    });

    for (const entry of source.items) {
      if (entry.item) {
        await Item.findByIdAndUpdate(entry.item, { $inc: { stock: -entry.quantity } });
      }
    }

    await auditFromReq(req, 'return', 'purchase', source._id.toString(), `${source.purchaseBillNumber} -> ${purchaseBillNumber}`, { total: source.total });
    res.status(201).json(ret);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listPurchases = async (req, res) => {
  try {
    const { from, to, partyId } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to + 'T23:59:59');
    }
    if (partyId) filter.party = partyId;
    const purchases = await Purchase.find(filter).populate('party', 'name gstin').sort({ date: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id).populate('party').populate('company');
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    if (purchase.type === 'purchase') {
      for (const entry of purchase.items) {
        if (entry.item) {
          await Item.findByIdAndUpdate(entry.item, { $inc: { stock: -entry.quantity } });
        }
      }
    } else {
      for (const entry of purchase.items) {
        if (entry.item) {
          await Item.findByIdAndUpdate(entry.item, { $inc: { stock: entry.quantity } });
        }
      }
    }
    await auditFromReq(req, 'delete', 'purchase', purchase._id.toString(), purchase.purchaseBillNumber, { type: purchase.type });
    await Purchase.findByIdAndDelete(req.params.id);
    res.json({ message: 'Purchase deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};