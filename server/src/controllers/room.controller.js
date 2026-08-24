import Room from '../models/Room.js';
import { asyncHandler } from '../utils/errorHandler.js';

export const listRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find().sort({ roomId: 1 }).lean();
  res.json(rooms);
});
