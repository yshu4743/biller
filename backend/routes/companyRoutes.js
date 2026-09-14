import express from 'express';
import { getCompanies, createCompany, updateCompany, deleteCompany, financialYearSummary, closeFinancialYear } from '../controllers/companyController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(protect, getCompanies).post(protect, createCompany);
router.route('/:id').put(protect, updateCompany).delete(protect, deleteCompany);
router.get('/:id/financial-year', protect, financialYearSummary);
router.post('/:id/close-financial-year', protect, closeFinancialYear);

export default router;