import express from 'express';
import { listItems, createItem, bulkCreateItems, updateItem, deleteItem, adjustStock } from '../controllers/itemController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(protect, listItems).post(protect, createItem);
router.post('/bulk', protect, bulkCreateItems);
router.route('/:id').put(protect, updateItem).delete(protect, deleteItem);
router.put('/:id/stock', protect, adjustStock);

export default router;