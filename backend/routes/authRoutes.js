import express from 'express';
import { login, register, getMe, updatePassword } from '../controllers/authController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', protect, adminOnly, register);
router.get('/me', protect, getMe);
router.put('/password', protect, updatePassword);

export default router;