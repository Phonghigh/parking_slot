import { z } from 'zod';
import { AppError } from '../errors.js';

const commuterQrSchema = z.object({
  uid: z.string().min(1),
  plate: z.string().optional()
});

const checkoutQrSchema = z.object({
  uid: z.string().min(1),
  sessionId: z.string().min(1)
});

function decodeBase64Json(raw: string) {
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    try {
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch {
      throw new AppError('QR_INVALID', 'Mã QR không hợp lệ', 400);
    }
  }
}

export function decodeCommuterQr(raw: string) {
  const parsed = commuterQrSchema.safeParse(decodeBase64Json(raw));
  if (!parsed.success) throw new AppError('QR_INVALID', 'Mã QR không hợp lệ', 400);
  return parsed.data;
}

export function decodeCheckoutQr(raw: string) {
  const parsed = checkoutQrSchema.safeParse(decodeBase64Json(raw));
  if (!parsed.success) throw new AppError('QR_INVALID', 'Mã ra bãi không hợp lệ', 400);
  return parsed.data;
}
