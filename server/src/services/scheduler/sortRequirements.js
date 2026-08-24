import { PRIORITY_WEIGHT } from '../../config/constants.js';

/**
 * Orders interview requirements so the scheduler places the "hardest to
 * satisfy later" ones first. Priority score combines:
 *  - company priority tier (Tier 1 goes first)
 *  - company selectivity (higher CGPA cutoff = fewer eligible students = less
 *    room to recover if we mis-schedule, so go earlier)
 *  - student interview load (a student shortlisted by many companies has a
 *    tighter web of constraints across their own calendar — placing their
 *    interviews earlier gives the greedy search more room to fit all of them)
 *  - company volume (companies interviewing many students need their limited
 *    operating window used efficiently, so they get a small boost too)
 *
 * This is a heuristic ordering, not an exact priority queue recomputed after
 * every placement — that keeps the algorithm a single readable pass.
 */
export function sortRequirements(requirements, { companiesById, studentInterviewCounts, companyVolume }) {
  const scored = requirements.map((req) => {
    const company = companiesById.get(req.companyId);
    const score =
      PRIORITY_WEIGHT[company.priorityTier] * 1000 +
      company.cgpaCutoff * 10 +
      (studentInterviewCounts.get(req.studentId) || 0) * 5 +
      (companyVolume.get(req.companyId) || 0) * 0.1;
    return { ...req, priorityScore: score };
  });

  scored.sort((a, b) => b.priorityScore - a.priorityScore);
  return scored;
}
