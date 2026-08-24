import { Router } from 'express';
import { generateSchedule, getSchedule, getMetrics, getHistory, getHistoryVersion } from '../controllers/schedule.controller.js';

const router = Router();
router.post('/generate', generateSchedule);
router.get('/metrics', getMetrics);
router.get('/history', getHistory);
router.get('/history/:version', getHistoryVersion);
router.get('/', getSchedule);

export default router;
