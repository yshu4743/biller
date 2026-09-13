import express from 'express';
import { listExpenses, createExpense, updateExpense, deleteExpense } from '../controllers/expenseController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(protect, listExpenses).post(protect, createExpense);
router.route('/:id').put(protect, updateExpense).delete(protect, deleteExpense);

export default router;