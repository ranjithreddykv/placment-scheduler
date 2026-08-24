import mongoose from 'mongoose';
import { PRIORITY_TIERS, COMPANY_STATUS, PANEL_STATUS } from '../config/constants.js';

const operatingSlotSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    startTime: { type: String, required: true }, // 'HH:mm'
    endTime: { type: String, required: true }, // 'HH:mm'
  },
  { _id: false }
);

const panelSchema = new mongoose.Schema(
  {
    panelId: { type: String, required: true },
    companyId: { type: String, required: true },
    status: { type: String, enum: Object.values(PANEL_STATUS), default: PANEL_STATUS.AVAILABLE },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String },
    cgpaCutoff: { type: Number, required: true },
    priorityTier: { type: String, enum: PRIORITY_TIERS, required: true },
    interviewDuration: { type: Number, required: true }, // minutes
    panels: { type: [panelSchema], default: [] },
    operatingSlots: { type: [operatingSlotSchema], default: [] },
    // Minutes late on `delayedDay` before the company can start interviewing that day.
    arrivalDelay: { type: Number, default: 0 },
    delayedDay: { type: Number, default: null },
    status: { type: String, enum: Object.values(COMPANY_STATUS), default: COMPANY_STATUS.SCHEDULED },
  },
  { timestamps: true }
);

export default mongoose.model('Company', companySchema);
