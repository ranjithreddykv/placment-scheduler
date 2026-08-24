import { PRIORITY_WEIGHT } from '../../config/constants.js';

/**
 * Simple, explainable cost function for a replan (see README "Replanning
 * Cost Function"). It isn't used to search for an optimal solution — the
 * scheduler is a greedy heuristic — it's used to score how disruptive a
 * replan turned out to be, which drives the LOW/MEDIUM/HIGH label shown to
 * the coordinator.
 *
 *   replanCost = movedInterviews*10 + movedStudents*5 + waitingTimeIncrease
 *              + priorityPenalty + unscheduledInterviews*100
 */
export function calculateChangeCost({ movedInterviewCount, movedStudentCount, waitingTimeIncreaseMinutes, movedCompanyTiers, newlyUnscheduledCount }) {
  const priorityPenalty = movedCompanyTiers.reduce((sum, tier) => sum + (PRIORITY_WEIGHT[tier] || 1) * 2, 0);

  const replanCost =
    movedInterviewCount * 10 +
    movedStudentCount * 5 +
    Math.max(0, waitingTimeIncreaseMinutes) +
    priorityPenalty +
    newlyUnscheduledCount * 100;

  return { replanCost: Math.round(replanCost), priorityPenalty };
}

export function classifyDisruptionLevel(replanCost) {
  if (replanCost < 100) return 'LOW';
  if (replanCost < 400) return 'MEDIUM';
  return 'HIGH';
}
