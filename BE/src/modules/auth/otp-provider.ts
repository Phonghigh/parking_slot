import { env } from '../../env.js';

export interface OtpProvider {
  send(phone: string, code: string): Promise<void>;
}

class MockOtpProvider implements OtpProvider {
  async send(phone: string, code: string) {
    console.info(`[otp:mock] ${phone} -> ${code}`);
  }
}

class EsmsOtpProvider implements OtpProvider {
  async send(phone: string, code: string) {
    if (!env.ESMS_API_KEY || !env.ESMS_SECRET_KEY) {
      throw new Error('Missing eSMS credentials');
    }

    const body = new URLSearchParams({
      ApiKey: env.ESMS_API_KEY,
      SecretKey: env.ESMS_SECRET_KEY,
      Phone: phone,
      Content: `Ma ParkHub: ${code}. Het han sau 5 phut.`,
      Brandname: env.ESMS_BRAND_NAME,
      SmsType: '2'
    });

    const response = await fetch('https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!response.ok) {
      throw new Error(`eSMS request failed with status ${response.status}`);
    }
  }
}

export function createOtpProvider(): OtpProvider {
  if (env.NODE_ENV !== 'production' && env.OTP_PROVIDER === 'mock') return new MockOtpProvider();
  if (env.OTP_PROVIDER === 'esms') return new EsmsOtpProvider();
  return new MockOtpProvider();
}
