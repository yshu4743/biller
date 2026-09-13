import express from 'express';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../controllers/companyController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(protect, getCompanies).post(protect, createCompany);
router.route('/:id').put(protect, updateCompany).delete(protect, deleteCompany);

export default router;