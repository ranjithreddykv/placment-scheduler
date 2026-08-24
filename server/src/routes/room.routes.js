import { Router } from 'express';
import { listRooms } from '../controllers/room.controller.js';

const router = Router();
router.get('/', listRooms);

export default router;
