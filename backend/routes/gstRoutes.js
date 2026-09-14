import express from 'express';
import { validateGstin } from '../utils/gstin.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/verify', protect, (req, res) => {
  const result = validateGstin(req.body.gstin);
  res.json({
    ...result,
    verifiedOnline: false,
    message: result.valid
      ? 'GSTIN structure is valid'
      : 'GSTIN appears to be invalid',
    note: 'This is a format-level check. Online verification on the GSTN portal requires a registered GSP API key.',
  });
});

export default router;