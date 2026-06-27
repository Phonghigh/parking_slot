import { describe, expect, it } from 'vitest';
import { isLotOpen } from './schedule.js';

const schedule = [
  { day: 6, open: '06:00', close: '22:00' },
  { day: 0, open: '00:00', close: '23:59', closed: true }
];

describe('isLotOpen', () => {
  it('returns true within configured hours', () => {
    expect(isLotOpen(schedule, new Date('2026-06-27T02:00:00.000Z'))).toBe(true);
  });

  it('returns false on closed days', () => {
    expect(isLotOpen(schedule, new Date('2026-06-28T02:00:00.000Z'))).toBe(false);
  });
});
