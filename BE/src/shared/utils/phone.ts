export function normalizeVietnamPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('84')) return `+${digits}`;
  if (digits.startsWith('0')) return `+84${digits.slice(1)}`;
  if (digits.length === 9) return `+84${digits}`;
  return phone.trim();
}
