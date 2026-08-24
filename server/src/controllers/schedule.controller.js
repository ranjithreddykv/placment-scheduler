import Interview from '../models/Interview.js';
import ScheduleVersion from '../models/ScheduleVersion.js';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { generateAndPersistSchedule } from '../services/scheduler/persistSchedule.js';

export const generateSchedule = asyncHandler(async (req, res) => {
  const { metrics } = await generateAndPersistSchedule();
  res.status(201).json({ message: 'Schedule generated', metrics });
});

export const getSchedule = asyncHandler(async (req, res) => {
  const { day, status } = req.query;
  const filter = {};
  if (day) filter.day = Number(day);
  if (status) filter.status = status;
  const interviews = await Interview.find(filter).lean();
  res.json(interviews);
});

export const getMetrics = asyncHandler(async (req, res) => {
  const latest = await ScheduleVersion.findOne().sort({ version: -1 }).lean();
  if (!latest) throw new ApiError(404, 'No schedule has been generated yet');
  res.json(latest.metrics);
});

export const getHistory = asyncHandler(async (req, res) => {
  const versions = await ScheduleVersion.find()
    .select('version createdAt trigger triggerDescription summary')
    .sort({ version: -1 })
    .lean();
  res.json(versions);
});

export const getHistoryVersion = asyncHandler(async (req, res) => {
  const version = await ScheduleVersion.findOne({ version: Number(req.params.version) }).lean();
  if (!version) throw new ApiError(404, `Schedule version ${req.params.version} not found`);
  res.json(version);
});
