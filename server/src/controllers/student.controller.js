import Student from '../models/Student.js';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';

export const listStudents = asyncHandler(async (req, res) => {
  const { branch, status, search } = req.query;
  const filter = {};
  if (branch) filter.branch = branch;
  if (status) filter.status = status;
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { studentId: new RegExp(search, 'i') }];

  const students = await Student.find(filter).sort({ studentId: 1 }).lean();
  res.json(students);
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ studentId: req.params.id }).lean();
  if (!student) throw new ApiError(404, `Student ${req.params.id} not found`);
  res.json(student);
});
