import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[jwt] FATAL: JWT_SECRET not set in production. Refusing to start with insecure fallback secret.');
    process.exit(1);
  }
  console.warn('[jwt] WARNING: JWT_SECRET not set — using dev fallback secret ' +
               '(DO NOT USE in production). Set JWT_SECRET in production.');
}
const EXPIRES_IN = '24h';

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
