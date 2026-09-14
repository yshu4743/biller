import Company from '../models/Company.js';
import Item from '../models/Item.js';
import Party from '../models/Party.js';
import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';
import Purchase from '../models/Purchase.js';
import Payment from '../models/Payment.js';
import Godown from '../models/Godown.js';
import User from '../models/User.js';
import BillCounter from '../models/BillCounter.js';
import AuditLog from '../models/AuditLog.js';
import { auditFromReq } from '../utils/audit.js';

const MODELS = { companies: Company, items: Item, parties: Party, invoices: Invoice, expenses: Expense, purchases: Purchase, payments: Payment, godowns: Godown, users: User };

export const createBackup = async (req, res) => {
  try {
    const collections = {};
    for (const [key, Model] of Object.entries(MODELS)) {
      collections[key] = key === 'users' ? await Model.find({}).select('-password') : await Model.find({});
    }
    await auditFromReq(req, 'export', 'backup', '', '', { counts: Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, v.length])) });
    res.json({
      app: 'biller',
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedBy: req.user?.email || '',
      collections,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const restoreBackup = async (req, res) => {
  try {
    if (req.body.confirm !== 'RESTORE') {
      return res.status(400).json({ message: 'Send confirm: "RESTORE" to wipe current data and restore the backup' });
    }
    const { collections } = req.body;
    if (!collections || typeof collections !== 'object') {
      return res.status(400).json({ message: 'Invalid backup payload — missing collections' });
    }

    await Promise.all(['companies', 'items', 'parties', 'invoices', 'expenses', 'purchases', 'payments', 'godowns', 'users', 'billCounters', 'auditLogs'].map((k) => {
      const m = { companies: Company, items: Item, parties: Party, invoices: Invoice, expenses: Expense, purchases: Purchase, payments: Payment, godowns: Godown, users: User, billCounters: BillCounter, auditLogs: AuditLog }[k];
      return m.deleteMany({});
    }));

    for (const [key, Model] of Object.entries(MODELS)) {
      if (Array.isArray(collections[key]) && collections[key].length > 0) {
        await Model.insertMany(collections[key], { ordered: false });
      }
    }

    await auditFromReq(req, 'restore', 'backup', '', '', { message: 'Full restore completed' });
    res.json({ message: 'Backup restored successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};