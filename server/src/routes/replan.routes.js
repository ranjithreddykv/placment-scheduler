import { Router } from 'express';
import { companyDelay, panelDrop, studentWithdraw, roomUnavailable } from '../controllers/replan.controller.js';

const router = Router();
router.post('/company-delay', companyDelay);
router.post('/panel-drop', panelDrop);
router.post('/student-withdraw', studentWithdraw);
router.post('/room-unavailable', roomUnavailable);

export default router;
