import { ROOM_STATUS } from '../../config/constants.js';

export function generateRooms(count) {
  return Array.from({ length: count }, (_, i) => ({
    roomId: `R${i + 1}`,
    name: `Room ${i + 1}`,
    capacity: 4,
    status: ROOM_STATUS.AVAILABLE,
    unavailableFrom: null,
    unavailableTo: null,
    unavailableDay: null,
  }));
}
