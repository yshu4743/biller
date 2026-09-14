import express from 'express';
import {
  salesReport,
  gstReport,
  purchaseReport,
  stockReport,
  profitLoss,
  partyStatement,
  dayBook,
  gstr1Summary,
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/sales', protect, salesReport);
router.get('/gst', protect, gstReport);
router.get('/gstr1', protect, gstr1Summary);
router.get('/purchases', protect, purchaseReport);
router.get('/stock', protect, stockReport);
router.get('/profit-loss', protect, profitLoss);
router.get('/party-statement/:id', protect, partyStatement);
router.get('/day-book', protect, dayBook);

export default router;