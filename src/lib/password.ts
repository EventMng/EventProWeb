import { randomBytes, randomInt, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  if (keyBuffer.length !== derivedKey.length) return false;
  return timingSafeEqual(keyBuffer, derivedKey);
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const ALL_CHARS = UPPERCASE + LOWERCASE + NUMBERS + SYMBOLS;

export function generateTempPassword(length = 14): string {
  const minLength = Math.max(12, length);
  const required = [
    UPPERCASE[randomInt(0, UPPERCASE.length)],
    LOWERCASE[randomInt(0, LOWERCASE.length)],
    NUMBERS[randomInt(0, NUMBERS.length)],
    SYMBOLS[randomInt(0, SYMBOLS.length)],
  ];

  const remainingLength = minLength - required.length;
  const remaining: string[] = [];
  for (let i = 0; i < remainingLength; i++) {
    remaining.push(ALL_CHARS[randomInt(0, ALL_CHARS.length)]);
  }

  const combined = [...required, ...remaining];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}
