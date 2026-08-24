import mongoose from 'mongoose';
import { ROOM_STATUS } from '../config/constants.js';

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    capacity: { type: Number, default: 4 },
    status: { type: String, enum: Object.values(ROOM_STATUS), default: ROOM_STATUS.AVAILABLE },
    // Optional maintenance/outage window: { day, startTime, endTime }
    unavailableFrom: { type: String, default: null },
    unavailableTo: { type: String, default: null },
    unavailableDay: { type: Number, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Room', roomSchema);
