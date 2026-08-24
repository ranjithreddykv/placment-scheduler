import { generateCompanyName } from './names.js';
import { pick, randomInt } from './random.js';
import { COMPANY_CATEGORIES, PLACEMENT_DAYS, COMPANY_STATUS, PANEL_STATUS } from '../../config/constants.js';

// Category -> (priority tier weight bias, panel count range, duration options, high-volume?)
// Panel counts are kept modest on purpose: 35 companies sharing only 20
// rooms means total panel-parallelism must stay in the same order of
// magnitude as room supply, or every company would be room-blocked
// regardless of how well the scheduler works. See generateShortlists.js for
// how this ties into realistic (not just percentage-based) demand sizing.
const CATEGORY_PROFILE = {
  'Mass Recruiter': { tier: 'TIER_3', panels: [2, 3], durations: [20, 30], volume: 'HIGH' },
  'IT Services': { tier: 'TIER_3', panels: [2, 3], durations: [20, 30], volume: 'HIGH' },
  Consulting: { tier: 'TIER_2', panels: [1, 2], durations: [30, 45], volume: 'MEDIUM' },
  'Core Engineering': { tier: 'TIER_2', panels: [1, 2], durations: [30, 45], volume: 'MEDIUM' },
  FinTech: { tier: 'TIER_1', panels: [1, 2], durations: [30, 45], volume: 'MEDIUM' },
  'Product Company': { tier: 'TIER_1', panels: [1, 2], durations: [45, 60], volume: 'LOW' },
  Startup: { tier: 'TIER_2', panels: [1, 2], durations: [20, 30], volume: 'LOW' },
};

const CUTOFF_BY_TIER = {
  TIER_1: [7.5, 8.0, 8.5],
  TIER_2: [6.5, 7.0, 7.5],
  TIER_3: [6.0, 6.5, 7.0],
};

/**
 * Builds the target tier distribution (9 Tier-1, 11 Tier-2, remainder Tier-3)
 * and assigns each a category consistent with that tier's typical profile.
 */
function buildTierPlan(count) {
  const tier1 = Math.round(count * 0.26); // ~9 of 35
  const tier2 = Math.round(count * 0.31); // ~11 of 35
  const tier3 = count - tier1 - tier2;
  return [...Array(tier1).fill('TIER_1'), ...Array(tier2).fill('TIER_2'), ...Array(tier3).fill('TIER_3')];
}

export function generateCompanies(rng, count) {
  const usedNames = new Set();
  const tierPlan = buildTierPlan(count);
  const companies = [];

  for (let i = 0; i < count; i += 1) {
    const priorityTier = tierPlan[i];
    const candidateCategories = COMPANY_CATEGORIES.filter((cat) => CATEGORY_PROFILE[cat].tier === priorityTier);
    const category = candidateCategories.length > 0 ? pick(rng, candidateCategories) : pick(rng, COMPANY_CATEGORIES);
    const profile = CATEGORY_PROFILE[category];

    const companyId = `C${String(i + 1).padStart(3, '0')}`;
    const name = generateCompanyName(rng, usedNames);
    const cgpaCutoff = pick(rng, CUTOFF_BY_TIER[priorityTier]);
    const interviewDuration = pick(rng, profile.durations);
    const panelCount = randomInt(rng, profile.panels[0], profile.panels[1]);

    const panels = Array.from({ length: panelCount }, (_, p) => ({
      panelId: `${companyId}-P${p + 1}`,
      companyId,
      status: PANEL_STATUS.AVAILABLE,
    }));

    // High-volume companies get two operating days to get through more students.
    const dayCount = profile.volume === 'HIGH' ? 2 : 1;
    const days = [...PLACEMENT_DAYS].sort(() => rng() - 0.5).slice(0, dayCount).sort((a, b) => a - b);
    const operatingSlots = days.map((day) => ({ day, startTime: '09:00', endTime: '18:00' }));

    companies.push({
      companyId,
      name,
      category,
      cgpaCutoff,
      priorityTier,
      interviewDuration,
      panels,
      operatingSlots,
      arrivalDelay: 0,
      delayedDay: null,
      status: COMPANY_STATUS.SCHEDULED,
      volumeProfile: profile.volume,
    });
  }

  return companies;
}
