import { randomName } from './names.js';
import { randomNormalClamped, pick, randomInt } from './random.js';
import { BRANCHES, STUDENT_STATUS } from '../../config/constants.js';

/**
 * Generates students with a realistic (normal, not uniform) CGPA distribution
 * centered around a typical engineering cohort, clamped to [6.0, 10.0].
 */
export function generateStudents(rng, count, graduationYear) {
  const students = [];

  for (let i = 1; i <= count; i += 1) {
    const cgpa = randomNormalClamped(rng, 7.5, 0.9, 6.0, 10.0);
    students.push({
      studentId: `S${String(i).padStart(4, '0')}`,
      name: randomName(rng),
      cgpa,
      branch: pick(rng, BRANCHES),
      graduationYear,
      // A small fraction have already withdrawn before scheduling even starts
      // (e.g. accepted an off-campus offer) — kept ACTIVE by default; the
      // demo/withdrawal disruption flips these live via the dashboard instead.
      status: STUDENT_STATUS.ACTIVE,
      shortlistedCompanies: [],
    });
  }

  return students;
}

// Exposed for tests / reuse elsewhere that need a plausible graduation year spread.
export function randomGraduationYear(rng, baseYear) {
  return baseYear + randomInt(rng, 0, 1);
}
