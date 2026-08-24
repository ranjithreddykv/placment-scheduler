import { toMinutes } from '../../utils/timeUtils.js';
import { effectiveMinutes } from '../../utils/metricsUtils.js';

// How much each company oversubscribes its OWN interview capacity. Capacity
// is derived from the company's real panels/duration/operating window, so
// this is realistic sizing rather than an arbitrary percentage of the whole
// 800-student cohort. Mass recruiters run a wider net relative to their own
// throughput (lots of applicants chase few slots); selective companies keep
// shortlists close to what they can actually get through.
const OVERSHOOT_RANGE = {
  'Mass Recruiter': [1.15, 1.35],
  'IT Services': [1.15, 1.35],
  Consulting: [1.05, 1.2],
  'Core Engineering': [1.0, 1.15],
  FinTech: [1.0, 1.15],
  'Product Company': [0.85, 1.05],
  Startup: [0.9, 1.1],
};

const BIASED_TOP_CATEGORIES = new Set(['Product Company', 'FinTech', 'Startup']);

// Aggregate panel throughput across 35 companies structurally exceeds what
// 20 shared rooms can physically host in 4 days (many companies competing
// for the same room-hours). This global knob tunes overall shortlist volume
// so the resulting schedule lands at a believable, demo-worthy scheduling
// rate (most interviews succeed, a clear, explainable minority don't)
// instead of either trivially-easy (nothing contends for rooms) or
// overwhelming (almost nothing gets scheduled). See README "Dataset Tuning".
const GLOBAL_DEMAND_SCALE = 0.65;

/** How many interviews a company can physically run across its operating window. */
function companyCapacity(company) {
  const windowMinutes = company.operatingSlots.reduce(
    (sum, slot) => sum + effectiveMinutes(toMinutes(slot.startTime), toMinutes(slot.endTime)),
    0
  );
  return (windowMinutes * company.panels.length) / company.interviewDuration;
}

function overshootFor(rng, category) {
  const [lo, hi] = OVERSHOOT_RANGE[category] || [1.1, 1.3];
  return lo + rng() * (hi - lo);
}

/**
 * For each company, shortlist a realistic subset of CGPA-eligible students,
 * sized to a modest oversubscription of that company's own interview
 * capacity (not a flat percentage of the whole cohort). Selective categories
 * bias toward the top of the eligible pool by CGPA, so strong students
 * naturally accumulate many interviews while others get only one or two.
 */
export function generateShortlists(rng, students, companies) {
  const studentsByCgpaDesc = [...students].sort((a, b) => b.cgpa - a.cgpa);

  for (const company of companies) {
    const eligible = studentsByCgpaDesc.filter((s) => s.cgpa >= company.cgpaCutoff);
    if (eligible.length === 0) continue;

    const overshoot = overshootFor(rng, company.category);
    const targetCount = Math.min(
      eligible.length,
      Math.max(1, Math.round(companyCapacity(company) * overshoot * GLOBAL_DEMAND_SCALE))
    );

    let pool;
    if (BIASED_TOP_CATEGORIES.has(company.category)) {
      // 70% drawn from the top half of the eligible (by CGPA) pool, 30% from the rest.
      const topHalf = eligible.slice(0, Math.max(1, Math.ceil(eligible.length / 2)));
      const restHalf = eligible.slice(Math.ceil(eligible.length / 2));
      const topPick = Math.round(targetCount * 0.7);
      const restPick = targetCount - topPick;
      pool = [...sampleWithoutReplacement(rng, topHalf, topPick), ...sampleWithoutReplacement(rng, restHalf, restPick)];
    } else {
      pool = sampleWithoutReplacement(rng, eligible, targetCount);
    }

    for (const student of pool) {
      student.shortlistedCompanies.push({ companyId: company.companyId, shortlistedAt: new Date() });
    }
  }

  return students;
}

function sampleWithoutReplacement(rng, arr, n) {
  if (n >= arr.length) return [...arr];
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < n; i += 1) {
    const idx = Math.floor(rng() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}
