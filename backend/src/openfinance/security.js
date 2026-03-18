import crypto from 'crypto';

export function sanitizeForLog(payload) {
  const text = JSON.stringify(payload || {});
  return text
    .replace(/"access_token"\s*:\s*"[^"]+"/gi, '"access_token":"***"')
    .replace(/"refresh_token"\s*:\s*"[^"]+"/gi, '"refresh_token":"***"')
    .replace(/"code"\s*:\s*"[^"]+"/gi, '"code":"***"');
}

function buildKey(keyText) {
  return crypto.createHash('sha256').update(keyText).digest();
}

export function encryptToken(value, keyText) {
  const iv = crypto.randomBytes(12);
  const key = buildKey(keyText);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptToken(valueEnc, keyText) {
  const [ivB64, tagB64, encryptedB64] = valueEnc.split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  const key = buildKey(keyText);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString('utf8');
}

export function randomState() {
  return crypto.randomBytes(16).toString('hex');
}

export function hashRawTx(raw) {
  return crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex');
}
