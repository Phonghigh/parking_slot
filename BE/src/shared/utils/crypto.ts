import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../env.js';

function key() {
  return createHash('sha256').update(env.ENCRYPTION_KEY).digest();
}

export function encryptText(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptText(value: string) {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function hashSecret(value: string) {
  return bcrypt.hash(value, 10);
}

export function compareSecret(value: string, hash: string) {
  return bcrypt.compare(value, hash);
}
