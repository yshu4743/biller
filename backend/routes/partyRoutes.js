import express from 'express';
import { listParties, createParty, updateParty, deleteParty, getParty } from '../controllers/partyController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(protect, listParties).post(protect, createParty);
router.route('/:id').get(protect, getParty).put(protect, updateParty).delete(protect, deleteParty);

export default router;