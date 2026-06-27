import { describe, expect, it } from 'vitest';
import { decodeCheckoutQr, decodeCommuterQr } from './qr.js';

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('qr utilities', () => {
  it('decodes commuter QR payloads', () => {
    expect(decodeCommuterQr(encode({ uid: 'user-1', plate: '51B-12345' }))).toEqual({
      uid: 'user-1',
      plate: '51B-12345'
    });
  });

  it('decodes checkout QR payloads', () => {
    expect(decodeCheckoutQr(encode({ uid: 'user-1', sessionId: 'session-1' }))).toEqual({
      uid: 'user-1',
      sessionId: 'session-1'
    });
  });
});
