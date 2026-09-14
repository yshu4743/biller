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
  gstr1Export,
  gstr3b,
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/sales', protect, salesReport);
router.get('/gst', protect, gstReport);
router.get('/gstr1', protect, gstr1Summary);
router.get('/gstr1/export', protect, gstr1Export);
router.get('/gstr3b', protect, gstr3b);
router.get('/purchases', protect, purchaseReport);
router.get('/stock', protect, stockReport);
router.get('/profit-loss', protect, profitLoss);
router.get('/party-statement/:id', protect, partyStatement);
router.get('/day-book', protect, dayBook);

export default router;