import { Router } from 'express';
import { listCompanies, getCompany } from '../controllers/company.controller.js';

const router = Router();
router.get('/', listCompanies);
router.get('/:id', getCompany);

export default router;
