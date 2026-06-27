type DaySchedule = {
  day: number;
  open: string;
  close: string;
  closed?: boolean;
};

function minutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function isLotOpen(schedule: unknown, at = new Date()) {
  if (!Array.isArray(schedule)) return true;
  const day = at.getDay();
  const current = at.getHours() * 60 + at.getMinutes();
  const entry = schedule.find((item): item is DaySchedule => {
    return Boolean(item && typeof item === 'object' && 'day' in item && item.day === day);
  });

  if (!entry || entry.closed) return false;
  const open = minutes(entry.open);
  const close = minutes(entry.close);
  if (close < open) return current >= open || current <= close;
  return current >= open && current <= close;
}
