import express from 'express';
import { listGodowns, createGodown, updateGodown, deleteGodown, transferStock } from '../controllers/godownController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(protect, listGodowns).post(protect, createGodown);
router.post('/transfer', protect, transferStock);
router.route('/:id').put(protect, updateGodown).delete(protect, deleteGodown);

export default router;