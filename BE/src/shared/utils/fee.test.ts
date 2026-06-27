import { describe, expect, it } from 'vitest';
import { calculateFee } from './fee.js';

describe('calculateFee', () => {
  it('charges at least one hour', () => {
    const result = calculateFee({
      checkInTime: new Date('2026-06-27T08:00:00.000Z'),
      checkOutTime: new Date('2026-06-27T08:05:00.000Z'),
      vehicleType: 'BIKE',
      priceBike: 5000,
      priceCar: 20000
    });

    expect(result).toEqual({ durationMin: 5, fee: 5000 });
  });

  it('rounds up partial hours', () => {
    const result = calculateFee({
      checkInTime: new Date('2026-06-27T08:00:00.000Z'),
      checkOutTime: new Date('2026-06-27T10:01:00.000Z'),
      vehicleType: 'CAR',
      priceBike: 5000,
      priceCar: 20000
    });

    expect(result).toEqual({ durationMin: 121, fee: 60000 });
  });
});
