import express from 'express';
import { createBackup, restoreBackup } from '../controllers/backupController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, adminOnly, createBackup);
router.post('/restore', protect, adminOnly, restoreBackup);

export default router;