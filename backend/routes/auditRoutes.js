import express from 'express';
import { listAudit } from '../controllers/auditController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, adminOnly, listAudit);

export default router;