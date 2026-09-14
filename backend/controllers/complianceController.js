import crypto from 'crypto';
import Invoice from '../models/Invoice.js';
import Company from '../models/Company.js';
import { validateGstin } from '../utils/gstin.js';

const UNIT_MAP = {
  pcs: 'PCS', box: 'BOX', kg: 'KGM', g: 'GM', ltr: 'LTR', ml: 'ML', mtr: 'MTR', cm: 'CM', set: 'SET', doz: 'DZN',
};
const toUnit = (u) => UNIT_MAP[(u || '').toLowerCase()] || 'NOS';

const ft = (n) => Math.round((Number(n) || 0) * 100) / 100;

function einvoicePayload(invoice, company) {
  const party = invoice.partySnapshot || {};
  const sellerGst = company.gstin || '';
  const buyerGst = party.gstin || '';
  const isExport = /^9[6-9]$/.test(party.stateCode || '');
  const supTyp = buyerGst ? 'B2B' : isExport ? 'EXP' : 'B2C';
  const date = new Date(invoice.date || Date.now());
  const dd = date.toISOString().slice(0, 10);

  const items = (invoice.items || []).map((it, idx) => {
    const qty = Number(it.quantity) || 0;
    const rate = Number(it.gstRate) || 0;
    const assAmt = ft(it.discountedAmount || it.amount);
    const gst = ft((assAmt * rate) / 100);
    const split = invoice.cgst > 0;
    return {
      SlNo: idx + 1,
      PrdDesc: it.name || '',
      HsnCd: (it.hsn || '').replace(/\D/g, '').slice(0, 8) || '0000',
      Qty: qty,
      Unit: toUnit(it.unit),
      UnitPrice: ft(it.price),
      TotAmt: ft(it.amount),
      Discount: ft(it.discount),
      GstRt: rate,
      AssAmt: assAmt,
      CgstAmt: split ? ft(gst / 2) : 0,
      SgstAmt: split ? ft(gst / 2) : 0,
      IgstAmt: split ? 0 : ft(gst),
    };
  });

  const gstinOk = validateGstin(sellerGst).valid;
  const sellerLegal = {
    Gstin: sellerGst,
    LglNm: company.name || '',
    TrdNm: company.name || '',
    Addr1: company.address || '',
    Loc: company.city || '',
    Pin: (company.pincode || '').toString().slice(0, 6),
    Stcd: String(company.stateCode || ''),
  };
  const buyerLegal = buyerGst
    ? { Gstin: buyerGst, LglNm: party.name || '', TrdNm: party.name || '', Addr1: party.address || '', Loc: '', Pin: '', Stcd: String(party.stateCode || '') }
    : { Gstin: '', LglNm: party.name || '', Addr1: party.address || '', Loc: '', Pin: '', Stcd: String(party.stateCode || ''), Pos: String(party.stateCode || '') };
  if (buyerGst) buyerLegal.Pos = String(party.stateCode || '');

  return {
    Version: '1.03',
    TranDtls: { TaxSch: 'GST', SupTyp: supTyp, RegRev: 'N', EcmGstin: '', IgstOnIntra: 'N' },
    DocDtls: { Typ: invoice.invoiceType === 'sale_return' ? 'CRN' : 'INV', No: invoice.billNumber, Dt: dd },
    SellerDtls: sellerLegal,
    BuyerDtls: buyerLegal,
    ItemList: items,
    ValDtls: {
      AssVal: ft(invoice.taxable),
      CgstVal: ft(invoice.cgst),
      SgstVal: ft(invoice.sgst),
      IgstVal: ft(invoice.igst),
      Discount: ft(invoice.discountAmount),
      RoundOff: ft(invoice.roundOff),
      TotInvVal: ft(invoice.total),
    },
    GenDetails: { gstinValid: gstinOk },
  };
}

function pseudoIrn(invoice, company) {
  const base = `${company.gstin || ''}|${invoice.billNumber}|INV|${new Date(invoice.date).toISOString().slice(0, 10)}|${invoice.total}`;
  return crypto.createHash('sha256').update(base, 'utf8').digest('hex').toUpperCase();
}

const ackNo = () => 'ACK' + new Date().toISOString().replace(/\D/g, '').slice(0, 14) + crypto.randomInt(1000, 9999);

export const generateEInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const company = invoice.company ? await Company.findById(invoice.company) : null;

    if (invoice.invoiceType !== 'sale' && invoice.invoiceType !== 'sale_return') {
      return res.status(400).json({ message: 'e-Invoice can only be generated for sale invoices and credit notes' });
    }
    if (!company || !company.isGstRegistered || !company.gstin) {
      return res.status(400).json({ message: 'Your company must be GST registered with a GSTIN to generate e-Invoices' });
    }
    if (invoice.eInvoice && invoice.eInvoice.irn) {
      return res.json({ invoice, generated: true, message: 'e-Invoice already generated', einvoice: einvoicePayload(invoice, company) });
    }

    invoice.eInvoice = {
      irn: pseudoIrn(invoice, company),
      ackNo: ackNo(),
      ackDate: new Date(),
      status: 'generated',
    };
    await invoice.save();
    res.status(201).json({ invoice, generated: false, einvoice: einvoicePayload(invoice, company) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEInvoiceJson = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const company = invoice.company ? await Company.findById(invoice.company) : null;
    res.json(einvoicePayload(invoice, company));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const generateEWayBill = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const company = invoice.company ? await Company.findById(invoice.company) : null;

    if (invoice.invoiceType !== 'sale') {
      return res.status(400).json({ message: 'E-Way bills apply to sale invoices only' });
    }
    if (!company || !company.isGstRegistered) {
      return res.status(400).json({ message: 'Your company must be GST registered to generate an E-Way bill' });
    }
    if (invoice.eWayBill && invoice.eWayBill.no) {
      return res.json({ invoice, message: 'E-Way bill already generated' });
    }

    const fromState = String(company.stateCode || '');
    const toState = String(invoice.partySnapshot?.stateCode || company.stateCode || '');
    const intraState = fromState === toState;
    const thresholdMet = invoice.total > 50000;

    const ewbNo = String(crypto.randomInt(10 ** 11, 10 ** 12));
    const today = new Date();
    const expiry = new Date(today);
    expiry.setDate(expiry.getDate() + (intraState ? 15 : 1));

    invoice.eWayBill = {
      no: ewbNo,
      date: today,
      expiry,
      status: 'generated',
      intraState,
      value: invoice.total,
      threshold: 50000,
      thresholdMet,
      fromState,
      toState,
    };
    await invoice.save();
    res.status(201).json({ invoice, message: 'E-Way bill generated', thresholdMet });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};