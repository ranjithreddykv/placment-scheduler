import { STUDENT_STATUS, COMPANY_STATUS } from '../../config/constants.js';

/**
 * Expands every (active student) x (shortlisted, non-cancelled company) pair
 * into an interview requirement — the unit of work the scheduler places.
 */
export function generateRequirements(students, companiesById) {
  const requirements = [];

  for (const student of students) {
    if (student.status !== STUDENT_STATUS.ACTIVE) continue;

    for (const shortlist of student.shortlistedCompanies) {
      const company = companiesById.get(shortlist.companyId);
      if (!company || company.status === COMPANY_STATUS.CANCELLED) continue;

      requirements.push({
        studentId: student.studentId,
        companyId: company.companyId,
      });
    }
  }

  return requirements;
}
