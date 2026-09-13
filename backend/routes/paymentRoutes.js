import express from 'express';
import { listPayments, createPayment, deletePayment, partyOutstanding } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(protect, listPayments).post(protect, createPayment);
router.get('/outstanding', protect, partyOutstanding);
router.delete('/:id', protect, deletePayment);

export default router;