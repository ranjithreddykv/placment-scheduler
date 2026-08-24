import mongoose from 'mongoose';
import { REPLAN_TRIGGER } from '../config/constants.js';

const changeSchema = new mongoose.Schema(
  {
    interviewId: { type: String, required: true },
    studentId: { type: String },
    studentName: { type: String },
    companyId: { type: String },
    companyName: { type: String },
    changeType: { type: String, enum: ['MOVED', 'UNSCHEDULED', 'CANCELLED', 'SCHEDULED'], required: true },
    reason: { type: String },
    old: {
      day: Number,
      startTime: String,
      endTime: String,
      roomId: String,
      panelId: String,
    },
    updated: {
      day: Number,
      startTime: String,
      endTime: String,
      roomId: String,
      panelId: String,
    },
    notify: { type: [String], default: [] },
  },
  { _id: false }
);

const scheduleVersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    trigger: { type: String, enum: Object.values(REPLAN_TRIGGER), required: true },
    triggerDescription: { type: String, default: '' },
    changes: { type: [changeSchema], default: [] },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    summary: {
      unchanged: { type: Number, default: 0 },
      moved: { type: Number, default: 0 },
      studentsAffected: { type: Number, default: 0 },
      roomsChanged: { type: Number, default: 0 },
      panelsChanged: { type: Number, default: 0 },
      newlyUnscheduled: { type: Number, default: 0 },
      replanCost: { type: Number, default: 0 },
      replanChurnPercent: { type: Number, default: 0 },
      disruptionLevel: { type: String, default: 'NONE' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('ScheduleVersion', scheduleVersionSchema);
