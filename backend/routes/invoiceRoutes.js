import express from 'express';
import {
  createInvoice,
  listInvoices,
  getInvoice,
  getInvoiceForPrint,
  deleteInvoice,
  updatePaymentStatus,
  partyInvoices,
} from '../controllers/invoiceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').post(protect, createInvoice).get(protect, listInvoices);
router.get('/party/:partyId', protect, partyInvoices);
router.get('/print/:id', protect, getInvoiceForPrint);
router.get('/:id', protect, getInvoice);
router.put('/:id/payment', protect, updatePaymentStatus);
router.delete('/:id', protect, deleteInvoice);

export default router;