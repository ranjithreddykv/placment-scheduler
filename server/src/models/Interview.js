import mongoose from 'mongoose';
import { INTERVIEW_STATUS, UNSCHEDULED_REASON } from '../config/constants.js';

const interviewSchema = new mongoose.Schema(
  {
    interviewId: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    day: { type: Number, default: null },
    startTime: { type: String, default: null }, // 'HH:mm'
    endTime: { type: String, default: null }, // 'HH:mm'
    roomId: { type: String, default: null },
    panelId: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(INTERVIEW_STATUS),
      default: INTERVIEW_STATUS.UNSCHEDULED,
    },
    unscheduledReason: { type: String, enum: [...Object.values(UNSCHEDULED_REASON), null], default: null },
    originalDay: { type: Number, default: null },
    originalStartTime: { type: String, default: null },
    originalEndTime: { type: String, default: null },
    originalRoomId: { type: String, default: null },
    originalPanelId: { type: String, default: null },
    lastMovedReason: { type: String, default: null },
  },
  { timestamps: true }
);

interviewSchema.index({ day: 1, roomId: 1, startTime: 1 });
interviewSchema.index({ day: 1, panelId: 1, startTime: 1 });
interviewSchema.index({ studentId: 1, day: 1 });
interviewSchema.index({ companyId: 1, status: 1 });

export default mongoose.model('Interview', interviewSchema);
