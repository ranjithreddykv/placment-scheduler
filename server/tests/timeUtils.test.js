import { describe, it, expect } from 'vitest';
import { isOverlapping, toMinutes, toHHMM, generateCandidateStarts, overlapsLunch } from '../src/utils/timeUtils.js';

describe('timeUtils', () => {
  it('toMinutes/toHHMM round-trip', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(toHHMM(570)).toBe('09:30');
  });

  it('isOverlapping detects overlap and touching intervals as non-overlapping', () => {
    expect(isOverlapping(600, 630, 615, 645)).toBe(true);
    expect(isOverlapping(600, 630, 630, 660)).toBe(false); // back-to-back is fine
    expect(isOverlapping(600, 630, 500, 600)).toBe(false);
  });

  it('overlapsLunch flags any interval touching 13:00-14:00', () => {
    expect(overlapsLunch(toMinutes('12:45'), toMinutes('13:15'))).toBe(true);
    expect(overlapsLunch(toMinutes('12:00'), toMinutes('12:30'))).toBe(false);
  });

  it('generateCandidateStarts never produces a slot overlapping lunch', () => {
    const starts = generateCandidateStarts(toMinutes('09:00'), toMinutes('18:00'), 30);
    for (const s of starts) {
      expect(overlapsLunch(s, s + 30)).toBe(false);
    }
    expect(starts).toContain(toMinutes('09:00'));
    expect(starts).not.toContain(toMinutes('17:45') + 15); // out of window
  });
});
