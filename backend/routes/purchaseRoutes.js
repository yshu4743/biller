import express from 'express';
import { createPurchase, listPurchases, getPurchase, deletePurchase, createPurchaseReturn } from '../controllers/purchaseController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').post(protect, createPurchase).get(protect, listPurchases);
router.post('/:id/return', protect, createPurchaseReturn);
router.route('/:id').get(protect, getPurchase).delete(protect, deletePurchase);

export default router;