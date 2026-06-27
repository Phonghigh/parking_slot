import type { FastifyInstance } from 'fastify';
import { Role, OtpProvider as PrismaOtpProvider } from '@prisma/client';
import { z } from 'zod';
import { env } from '../../env.js';
import { prisma } from '../../shared/prisma/client.js';
import { compareSecret, hashSecret, sha256 } from '../../shared/utils/crypto.js';
import { normalizeVietnamPhone } from '../../shared/utils/phone.js';
import { AppError } from '../../shared/errors.js';
import { createRefreshToken, signAccessToken } from '../../shared/auth/jwt.js';
import { createOtpProvider } from './otp-provider.js';

const phoneSchema = z.object({ phone: z.string().min(8) });
const verifySchema = phoneSchema.extend({ code: z.string().regex(/^\d{6}$/), name: z.string().min(1).optional() });
const refreshSchema = z.object({ refreshToken: z.string().min(20) });

function randomOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function authRoutes(app: FastifyInstance) {
  const provider = createOtpProvider();

  app.post('/auth/otp/send', async (request) => {
    const { phone } = phoneSchema.parse(request.body);
    const normalizedPhone = normalizeVietnamPhone(phone);
    const recentCount = await prisma.otpCode.count({
      where: {
        phone: normalizedPhone,
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }
      }
    });

    if (recentCount >= 3) {
      throw new AppError('OTP_RATE_LIMITED', 'Bạn đã yêu cầu quá nhiều mã OTP. Vui lòng thử lại sau.', 429);
    }

    const code = randomOtp();
    await prisma.otpCode.create({
      data: {
        phone: normalizedPhone,
        codeHash: await hashSecret(code),
        provider: env.OTP_PROVIDER.toUpperCase() as PrismaOtpProvider,
        expiresAt: new Date(Date.now() + env.OTP_TTL * 1000)
      }
    });
    await provider.send(normalizedPhone, code);
    return { ok: true };
  });

  app.post('/auth/otp/verify', async (request) => {
    const { phone, code, name } = verifySchema.parse(request.body);
    const normalizedPhone = normalizeVietnamPhone(phone);
    const otp = await prisma.otpCode.findFirst({
      where: { phone: normalizedPhone, used: false },
      orderBy: { createdAt: 'desc' }
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new AppError('OTP_EXPIRED', 'Mã OTP đã hết hạn', 400);
    }
    if (otp.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new AppError('OTP_TOO_MANY_ATTEMPTS', 'Mã OTP đã bị khóa', 400);
    }

    const valid = await compareSecret(code, otp.codeHash);
    if (!valid) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new AppError('OTP_INVALID', 'Mã OTP không đúng', 400);
    }

    const [partner, staff] = await Promise.all([
      prisma.partner.findUnique({ where: { phone: normalizedPhone } }),
      prisma.staff.findUnique({ where: { phone: normalizedPhone } })
    ]);
    const role = staff ? Role.STAFF : partner ? Role.PARTNER : Role.COMMUTER;
    const user = await prisma.user.upsert({
      where: { phone: normalizedPhone },
      create: { phone: normalizedPhone, name: name ?? staff?.name ?? partner?.ownerName ?? 'ParkHub User', role },
      update: { ...(name ? { name } : {}), role }
    });
    await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

    const refreshToken = createRefreshToken();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL * 1000)
      }
    });

    return {
      accessToken: signAccessToken(app, {
        sub: user.id,
        role,
        staffId: staff?.id,
        partnerId: partner?.id ?? staff?.partnerId
      }),
      refreshToken,
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role }
    };
  });

  app.post('/auth/refresh', async (request) => {
    const { refreshToken } = refreshSchema.parse(request.body);
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true }
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new AppError('REFRESH_INVALID', 'Phiên đăng nhập đã hết hạn', 401);
    }

    const [partner, staff] = await Promise.all([
      prisma.partner.findUnique({ where: { phone: record.user.phone } }),
      prisma.staff.findUnique({ where: { phone: record.user.phone } })
    ]);

    return {
      accessToken: signAccessToken(app, {
        sub: record.user.id,
        role: record.user.role,
        staffId: staff?.id,
        partnerId: partner?.id ?? staff?.partnerId
      })
    };
  });
}
