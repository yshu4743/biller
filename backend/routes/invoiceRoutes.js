import express from 'express';
import {
  createInvoice,
  createBatchInvoices,
  bulkPrint,
  listInvoices,
  getInvoice,
  getInvoiceForPrint,
  deleteInvoice,
  updatePaymentStatus,
  partyInvoices,
} from '../controllers/invoiceController.js';
import { protect } from '../middleware/auth.js';
import { generateEInvoice, getEInvoiceJson, generateEWayBill } from '../controllers/complianceController.js';

const router = express.Router();

router.route('/').post(protect, createInvoice).get(protect, listInvoices);
router.post('/batch', protect, createBatchInvoices);
router.post('/bulk-print', protect, bulkPrint);
router.get('/party/:partyId', protect, partyInvoices);
router.get('/print/:id', protect, getInvoiceForPrint);
router.get('/:id', protect, getInvoice);
router.put('/:id/payment', protect, updatePaymentStatus);
router.post('/:id/e-invoice', protect, generateEInvoice);
router.get('/:id/e-invoice/json', protect, getEInvoiceJson);
router.post('/:id/e-way-bill', protect, generateEWayBill);
router.delete('/:id', protect, deleteInvoice);

export default router;