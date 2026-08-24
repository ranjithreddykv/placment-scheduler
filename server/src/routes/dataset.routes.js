import { Router } from 'express';
import { generateDataset } from '../controllers/dataset.controller.js';

const router = Router();
router.post('/generate', generateDataset);

export default router;
