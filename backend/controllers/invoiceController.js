import Invoice from '../models/Invoice.js';
import BillCounter from '../models/BillCounter.js';
import Item from '../models/Item.js';
import Party from '../models/Party.js';
import Company from '../models/Company.js';

function toWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  result += ' Only';
  return result;
}

async function generateBillNumber(companyId, prefix) {
  const fy = new Date().getFullYear();
  const fyStr = fy.toString().slice(-2) + (fy + 1).toString().slice(-2);
  const fullPrefix = `${prefix}-${fyStr}`;
  const counter = await BillCounter.findOneAndUpdate(
    { company: companyId, prefix, year: fyStr },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `${fullPrefix}-${String(counter.sequence).padStart(4, '0')}`;
}

function getHSNMain(code) {
  return code ? code.toString().substring(0, 4) : '';
}

export const createInvoice = async (req, res) => {
  try {
    const { company: companyId, partyId, items, discountType, discountValue, paymentMode, paidAmount, notes, salesPerson, invoiceType, dueDate } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ message: 'No items in invoice' });

    const company = await Company.findById(companyId);
    const party = partyId ? await Party.findById(partyId) : null;

    const isCompanyGst = company && company.isGstRegistered && company.gstin;
    const isPartyGst = party && party.gstin;
    const isSameState = !party || !party.stateCode || !company?.stateCode || party.stateCode === company.stateCode;

    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalDiscount = 0;

    const invoiceItems = [];
    for (const entry of items) {
      const itemDoc = await Item.findById(entry.itemId);
      const qty = Number(entry.quantity) || 1;
      const price = Number(entry.price) || (itemDoc ? itemDoc.salePrice : 0);
      const gstRate = Number(entry.gstRate !== undefined ? entry.gstRate : (itemDoc ? itemDoc.gstRate : 0));
      const gstIncluded = entry.gstIncluded !== undefined ? entry.gstIncluded : (itemDoc ? itemDoc.gstIncluded : false);
      const itemDiscount = Number(entry.discount) || 0;
      const amount = qty * price;
      const discountedAmount = amount - itemDiscount;
      const taxableAmount = gstIncluded && gstRate > 0 ? discountedAmount / (1 + gstRate / 100) : discountedAmount;
      const gstAmount = (taxableAmount * gstRate) / 100;

      if (isSameState) {
        totalCgst += gstAmount / 2;
        totalSgst += gstAmount / 2;
      } else {
        totalIgst += gstAmount;
      }
      totalDiscount += itemDiscount;
      subtotal += amount;

      invoiceItems.push({
        item: itemDoc ? itemDoc._id : null,
        name: entry.name || (itemDoc ? itemDoc.name : ''),
        hsn: entry.hsn || (itemDoc ? itemDoc.hsn : ''),
        unit: entry.unit || (itemDoc ? itemDoc.unit : 'pcs'),
        quantity: qty,
        price,
        mrp: entry.mrp || (itemDoc ? itemDoc.mrp : 0),
        gstRate,
        gstIncluded,
        amount,
        discount: itemDiscount,
        discountedAmount,
      });
    }

    let billDiscount = 0;
    if (discountValue > 0) {
      if (discountType === 'percent') {
        billDiscount = subtotal * discountValue / 100;
      } else {
        billDiscount = discountValue;
      }
      totalDiscount += billDiscount;
    }

    const taxable = subtotal - totalDiscount;
    const totalGst = totalCgst + totalSgst + totalIgst;
    let total = taxable + totalGst;
    const roundOff = Math.round(total) - total;
    total = Math.round(total);

    const billNumber = await generateBillNumber(companyId, company ? company.invoicePrefix : 'INV');

    const defaultPaid = paymentMode === 'cash' || paymentMode === 'upi' || paymentMode === 'card' ? total : 0;
    const effectivePaid = paidAmount > 0 ? Math.min(paidAmount, total) : defaultPaid;

    const invoice = await Invoice.create({
      billNumber,
      prefix: company ? company.invoicePrefix : 'INV',
      company: companyId,
      party: party ? party._id : undefined,
      partySnapshot: party ? { name: party.name, gstin: party.gstin, phone: party.phone, address: party.address, stateCode: party.stateCode } : undefined,
      items: invoiceItems,
      invoiceType: invoiceType || 'sale',
      subtotal,
      discountType: discountType || 'amount',
      discountValue: discountValue || 0,
      discountAmount: totalDiscount,
      taxable,
      cgst: Math.round(totalCgst * 100) / 100,
      sgst: Math.round(totalSgst * 100) / 100,
      igst: Math.round(totalIgst * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      roundOff: Math.round(roundOff * 100) / 100,
      total,
      amountInWords: toWords(total),
      status: effectivePaid >= total ? 'paid' : effectivePaid > 0 ? 'partial' : 'unpaid',
      paidAmount: effectivePaid,
      dueAmount: total - effectivePaid,
      paymentMode: paymentMode || 'cash',
      dueDate: dueDate || null,
      notes: notes || '',
      salesPerson: salesPerson || '',
      createdBy: req.user._id,
    });

    if (invoice.invoiceType === 'sale') {
      for (const entry of items) {
        await Item.findByIdAndUpdate(entry.itemId, { $inc: { stock: -Number(entry.quantity) || 0 } });
      }
    }

    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listInvoices = async (req, res) => {
  try {
    const { from, to, status, partyId, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to + 'T23:59:59');
    }
    if (status) filter.status = status;
    if (partyId) filter.party = partyId;
    if (search) {
      filter.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
        { 'partySnapshot.name': { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter).populate('party', 'name shopName gstin').sort({ date: -1, createdAt: -1 }).skip(skip).limit(Number(limit));
    res.json({ invoices, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('party').populate('company');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInvoiceForPrint = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('party').populate('company');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const company = await Company.findById(invoice.company);
    res.json({ invoice, company });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.invoiceType === 'sale') {
      for (const entry of invoice.items) {
        if (entry.item) {
          await Item.findByIdAndUpdate(entry.item, { $inc: { stock: entry.quantity } });
        }
      }
    }
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { paidAmount } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    invoice.paidAmount = paidAmount;
    if (paidAmount >= invoice.total) invoice.status = 'paid';
    else if (paidAmount > 0) invoice.status = 'partial';
    else invoice.status = 'unpaid';
    invoice.dueAmount = invoice.total - paidAmount;
    await invoice.save();
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const partyInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ party: req.params.partyId }).sort({ date: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};