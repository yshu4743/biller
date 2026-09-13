import express from 'express';
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(protect, adminOnly, listUsers).post(protect, adminOnly, createUser);
router.route('/:id').put(protect, adminOnly, updateUser).delete(protect, adminOnly, deleteUser);

export default router;