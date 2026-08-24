import { Router } from 'express';
import { listStudents, getStudent } from '../controllers/student.controller.js';

const router = Router();
router.get('/', listStudents);
router.get('/:id', getStudent);

export default router;
