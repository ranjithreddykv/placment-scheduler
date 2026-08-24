import { createRng } from './random.js';
import { generateStudents } from './generateStudents.js';
import { generateCompanies } from './generateCompanies.js';
import { generateRooms } from './generateRooms.js';
import { generateShortlists } from './generateShortlists.js';

const DEFAULTS = {
  studentCount: 800,
  companyCount: 35,
  roomCount: 20,
  graduationYear: 2026,
  seed: 42,
};

/** Builds the full demo dataset in memory (no DB writes) and returns it plus summary stats. */
export function buildDataset(overrides = {}) {
  const opts = { ...DEFAULTS, ...overrides };
  const rng = createRng(opts.seed);

  const students = generateStudents(rng, opts.studentCount, opts.graduationYear);
  const companies = generateCompanies(rng, opts.companyCount);
  const rooms = generateRooms(opts.roomCount);
  generateShortlists(rng, students, companies);

  const stats = summarize(students, companies, rooms);
  return { students, companies, rooms, stats };
}

function summarize(students, companies, rooms) {
  const shortlistCounts = students.map((s) => s.shortlistedCompanies.length);
  const totalRequirements = shortlistCounts.reduce((a, b) => a + b, 0);
  const studentsWithNoOffers = shortlistCounts.filter((c) => c === 0).length;
  const studentsWithManyOffers = shortlistCounts.filter((c) => c >= 5).length;

  const tierCounts = companies.reduce((acc, c) => {
    acc[c.priorityTier] = (acc[c.priorityTier] || 0) + 1;
    return acc;
  }, {});

  const avgCgpa = students.reduce((sum, s) => sum + s.cgpa, 0) / students.length;

  return {
    studentCount: students.length,
    companyCount: companies.length,
    roomCount: rooms.length,
    totalInterviewRequirements: totalRequirements,
    avgShortlistsPerStudent: Math.round((totalRequirements / students.length) * 10) / 10,
    studentsWithNoShortlists: studentsWithNoOffers,
    studentsWithFiveOrMoreShortlists: studentsWithManyOffers,
    avgCgpa: Math.round(avgCgpa * 100) / 100,
    companiesByTier: tierCounts,
  };
}
