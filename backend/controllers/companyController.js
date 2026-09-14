import Company from '../models/Company.js';
import Item from '../models/Item.js';
import Party from '../models/Party.js';
import Invoice from '../models/Invoice.js';
import { validateGstin } from '../utils/gstin.js';
import { auditFromReq } from '../utils/audit.js';

function gstinError(body) {
  const gstin = String(body.gstin || '').trim();
  if (!gstin || !body.isGstRegistered) return null;
  const result = validateGstin(gstin);
  if (!result.valid) return { message: `Invalid GSTIN: ${result.errors.join('; ')}` };
  return null;
}

export const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: 1 });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCompany = async (req, res) => {
  try {
    const gstErr = gstinError(req.body);
    if (gstErr) return res.status(400).json(gstErr);
    const company = await Company.create({ ...req.body, createdBy: req.user._id });
    await auditFromReq(req, 'create', 'company', company._id.toString(), company.name, {});
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const gstErr = gstinError(req.body);
    if (gstErr) return res.status(400).json(gstErr);
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    await auditFromReq(req, 'update', 'company', company._id.toString(), company.name, {});
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    await auditFromReq(req, 'delete', 'company', company._id.toString(), company.name, {});
    res.json({ message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const financialYearSummary = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const items = await Item.find({});
    const closingStockValue = items.reduce((s, i) => s + ((i.stock || 0) * (i.purchasePrice || 0)), 0);

    const invoices = await Invoice.find({ company: company._id, invoiceType: 'sale' });
    const outstandingByParty = {};
    let totalDues = 0;
    for (const inv of invoices) {
      const due = (inv.totalAmount || 0) - (inv.paidAmount || 0);
      if (inv.party && due > 0) {
        outstandingByParty[inv.party] = (outstandingByParty[inv.party] || 0) + due;
        totalDues += due;
      }
    }

    res.json({
      company: company.name,
      currentYear: (new Date().getFullYear() + (company.fyOffset || 0)).toString().slice(-2) + (new Date().getFullYear() + (company.fyOffset || 0) + 1).toString().slice(-2),
      closingStockValue,
      partiesWithDues: Object.keys(outstandingByParty).length,
      totalOutstanding: totalDues,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const closeFinancialYear = async (req, res) => {
  try {
    if (req.body.confirm !== 'CLOSE') {
      return res.status(400).json({ message: 'Send confirm: "CLOSE" to close the financial year' });
    }
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const invoices = await Invoice.find({ company: company._id, invoiceType: 'sale' });
    const outstandingByParty = {};
    for (const inv of invoices) {
      const due = (inv.totalAmount || 0) - (inv.paidAmount || 0);
      if (inv.party && due > 0) outstandingByParty[inv.party] = (outstandingByParty[inv.party] || 0) + due;
    }

    let partiesUpdated = 0;
    for (const [partyId, due] of Object.entries(outstandingByParty)) {
      await Party.findByIdAndUpdate(partyId, { $inc: { openingBalance: due } });
      partiesUpdated++;
    }

    company.fyOffset = (company.fyOffset || 0) + 1;
    const nextYearPrefix = (new Date().getFullYear() + company.fyOffset).toString().slice(-2) + (new Date().getFullYear() + company.fyOffset + 1).toString().slice(-2);
    await company.save();
    await auditFromReq(req, 'close_fy', 'company', company._id.toString(), company.name, { nextYearPrefix, partiesUpdated });

    res.json({
      message: 'Financial year closed. Party dues carried forward as opening balances; new bill numbers will start fresh in the new year.',
      nextYearPrefix,
      partiesUpdated,
      duesCarriedForward: Object.values(outstandingByParty).reduce((a, b) => a + b, 0),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};