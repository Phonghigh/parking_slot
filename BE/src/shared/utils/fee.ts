import type { VehicleType } from '@prisma/client';

export function calculateDurationMin(checkInTime: Date, checkOutTime: Date) {
  return Math.max(Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000), 0);
}

export function calculateFee(input: {
  checkInTime: Date;
  checkOutTime: Date;
  vehicleType: VehicleType;
  priceBike: number;
  priceCar: number;
}) {
  const durationMin = calculateDurationMin(input.checkInTime, input.checkOutTime);
  const billableHours = Math.max(Math.ceil(durationMin / 60), 1);
  const price = input.vehicleType === 'BIKE' ? input.priceBike : input.priceCar;
  return { durationMin, fee: billableHours * price };
}
