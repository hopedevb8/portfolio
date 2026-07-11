require('./loadEnv');

const crypto = require('node:crypto');

const ACCESS_TOKEN_TTL_MS = Number(process.env.ADMIN_ACCESS_TOKEN_TTL_MS || 15 * 60 * 1000);
const REFRESH_TOKEN_TTL_MS = Number(process.env.ADMIN_REFRESH_TOKEN_TTL_MS || 7 * 24 * 60 * 60 * 1000);
const LOGIN_ATTEMPT_WINDOW_MS = Number(
  process.env.ADMIN_LOGIN_ATTEMPT_WINDOW_MS || 10 * 60 * 1000,
);
const LOGIN_ATTEMPT_MAX = Number(process.env.ADMIN_LOGIN_ATTEMPT_MAX || 5);
const LOGIN_BLOCK_MS = Number(process.env.ADMIN_LOGIN_BLOCK_MS || 15 * 60 * 1000);
const REFRESH_COOKIE_NAME = 'portfolio_admin_refresh';
const REFRESH_COOKIE_DOMAIN = String(process.env.ADMIN_REFRESH_COOKIE_DOMAIN || '').trim();
const ACCESS_TOKEN_SECRET =
  process.env.ADMIN_ACCESS_TOKEN_SECRET || 'change-this-secret-before-deploying';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-admin-password';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const AUTH_ISSUER = 'portfolio-admin-api';

const normalizeSameSite = value => {
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (normalizedValue === 'strict') {
    return 'Strict';
  }

  if (normalizedValue === 'none') {
    return 'None';
  }

  return 'Lax';
};

const REFRESH_COOKIE_SAME_SITE = normalizeSameSite(
  process.env.ADMIN_REFRESH_COOKIE_SAME_SITE ||
    (process.env.NODE_ENV === 'production' ? 'None' : 'Lax'),
);
const REFRESH_COOKIE_SECURE =
  REFRESH_COOKIE_SAME_SITE === 'None'
    ? true
    : String(process.env.ADMIN_REFRESH_COOKIE_SECURE || '').trim()
      ? String(process.env.ADMIN_REFRESH_COOKIE_SECURE).trim().toLowerCase() === 'true'
      : process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.ADMIN_ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

let didWarnAboutDefaults = false;

const warnAboutInsecureDefaults = () => {
  if (didWarnAboutDefaults) {
    return;
  }

  if (
    !process.env.ADMIN_ACCESS_TOKEN_SECRET ||
    (!process.env.ADMIN_PASSWORD_HASH && !process.env.ADMIN_PASSWORD)
  ) {
    console.warn(
      '[auth] Using fallback admin auth configuration. Set ADMIN_USERNAME, ADMIN_PASSWORD or ADMIN_PASSWORD_HASH, and ADMIN_ACCESS_TOKEN_SECRET before deploying.',
    );
  }

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    console.warn(
      '[auth] ADMIN_ALLOWED_ORIGINS is not set. Cross-origin admin login will be blocked unless the frontend origin is explicitly allowed.',
    );
  }

  didWarnAboutDefaults = true;
};

warnAboutInsecureDefaults();
const loginAttempts = new Map();

const isAllowedOrigin = origin => {
  if (!origin) {
    return false;
  }

  if (allowedOrigins.length > 0) {
    return allowedOrigins.includes(origin);
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

const toBase64Url = value =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = value => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = `${base64}${'='.repeat((4 - (base64.length % 4 || 4)) % 4)}`;

  return Buffer.from(paddedBase64, 'base64');
};

const compareValues = (left, right) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const hashPassword = (password, salt) =>
  crypto.scryptSync(password, salt, 64).toString('hex');

const verifyPassword = password => {
  if (ADMIN_PASSWORD_HASH) {
    const [scheme, salt, expectedHash] = ADMIN_PASSWORD_HASH.split(':');

    if (scheme !== 'scrypt' || !salt || !expectedHash) {
      return false;
    }

    const actualHash = hashPassword(password, salt);
    return compareValues(actualHash, expectedHash);
  }

  return compareValues(password, ADMIN_PASSWORD);
};

const hashRefreshToken = token =>
  crypto.createHash('sha256').update(token).digest('hex');

const signAccessToken = payload => {
  const encodedHeader = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', ACCESS_TOKEN_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const verifyAccessToken = token => {
  const [encodedHeader, encodedPayload, receivedSignature] = String(token || '').split('.');

  if (!encodedHeader || !encodedPayload || !receivedSignature) {
    throw new Error('Malformed access token.');
  }

  const expectedSignature = crypto
    .createHmac('sha256', ACCESS_TOKEN_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  if (!compareValues(receivedSignature, expectedSignature)) {
    throw new Error('Invalid access token signature.');
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload).toString('utf8'));
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (payload.iss !== AUTH_ISSUER || payload.exp <= nowInSeconds) {
    throw new Error('Access token expired or invalid.');
  }

  return payload;
};

const parseCookies = cookieHeader =>
  String(cookieHeader || '')
    .split(';')
    .map(pair => pair.trim())
    .filter(Boolean)
    .reduce((cookies, pair) => {
      const separatorIndex = pair.indexOf('=');

      if (separatorIndex === -1) {
        return cookies;
      }

      const key = pair.slice(0, separatorIndex).trim();
      const value = decodeURIComponent(pair.slice(separatorIndex + 1).trim());

      cookies[key] = value;
      return cookies;
    }, {});

const createAccessToken = ({ userName, sessionId }) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = Math.floor((Date.now() + ACCESS_TOKEN_TTL_MS) / 1000);

  return {
    token: signAccessToken({
      iss: AUTH_ISSUER,
      sub: userName,
      sid: sessionId,
      iat: issuedAt,
      exp: expiresAt,
    }),
    expiresAt,
  };
};

const createRefreshTokenRecord = userName => {
  const sessionId = crypto.randomUUID();
  const rawRefreshToken = crypto.randomBytes(48).toString('base64url');
  const refreshTokenHash = hashRefreshToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
  const now = new Date().toISOString();

  return {
    sessionId,
    rawRefreshToken,
    refreshTokenHash,
    expiresAt,
    createdAt: now,
    updatedAt: now,
    userName,
  };
};

const serializeRefreshCookie = (req, refreshTokenRecord) => {
  const parts = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(
      `${refreshTokenRecord.sessionId}.${refreshTokenRecord.rawRefreshToken}`,
    )}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${REFRESH_COOKIE_SAME_SITE}`,
    `Max-Age=${Math.floor(REFRESH_TOKEN_TTL_MS / 1000)}`,
  ];

  if (REFRESH_COOKIE_DOMAIN) {
    parts.push(`Domain=${REFRESH_COOKIE_DOMAIN}`);
  }

  if (REFRESH_COOKIE_SECURE) {
    parts.push('Secure');
  }

  return parts.join('; ');
};

const clearRefreshCookie = () => {
  const parts = [
    `${REFRESH_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    `SameSite=${REFRESH_COOKIE_SAME_SITE}`,
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];

  if (REFRESH_COOKIE_DOMAIN) {
    parts.push(`Domain=${REFRESH_COOKIE_DOMAIN}`);
  }

  if (REFRESH_COOKIE_SECURE) {
    parts.push('Secure');
  }

  return parts.join('; ');
};

const getRefreshCookiePayload = req => {
  const cookies = parseCookies(req.headers.cookie);
  const rawCookieValue = cookies[REFRESH_COOKIE_NAME];

  if (!rawCookieValue) {
    return null;
  }

  const separatorIndex = rawCookieValue.indexOf('.');

  if (separatorIndex === -1) {
    return null;
  }

  return {
    sessionId: rawCookieValue.slice(0, separatorIndex),
    rawRefreshToken: rawCookieValue.slice(separatorIndex + 1),
  };
};

const isSessionActive = session => {
  if (!session || session.revokedAt) {
    return false;
  }

  return new Date(session.expiresAt).getTime() > Date.now();
};

const validateAdminCredentials = ({ username, password }) =>
  compareValues(String(username || '').trim(), ADMIN_USERNAME) && verifyPassword(String(password || ''));

const getLoginAttemptState = identifier => {
  const now = Date.now();
  const currentState = loginAttempts.get(identifier);

  if (!currentState) {
    return null;
  }

  if (currentState.blockedUntil && currentState.blockedUntil > now) {
    return currentState;
  }

  if (now - currentState.firstAttemptAt > LOGIN_ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(identifier);
    return null;
  }

  if (currentState.blockedUntil && currentState.blockedUntil <= now) {
    loginAttempts.delete(identifier);
    return null;
  }

  return currentState;
};

const assertLoginAttemptAllowed = identifier => {
  const attemptState = getLoginAttemptState(identifier);

  if (!attemptState?.blockedUntil || attemptState.blockedUntil <= Date.now()) {
    return;
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((attemptState.blockedUntil - Date.now()) / 1000));
  const error = new Error('Too many failed login attempts. Try again later.');

  error.code = 'LOGIN_RATE_LIMITED';
  error.statusCode = 429;
  error.retryAfterSeconds = retryAfterSeconds;
  throw error;
};

const recordFailedLoginAttempt = identifier => {
  const now = Date.now();
  const currentState = getLoginAttemptState(identifier);

  if (!currentState) {
    loginAttempts.set(identifier, {
      count: 1,
      firstAttemptAt: now,
      blockedUntil: null,
    });
    return;
  }

  const nextCount = currentState.count + 1;
  const shouldBlock = nextCount >= LOGIN_ATTEMPT_MAX;

  loginAttempts.set(identifier, {
    count: nextCount,
    firstAttemptAt: currentState.firstAttemptAt,
    blockedUntil: shouldBlock ? now + LOGIN_BLOCK_MS : null,
  });
};

const clearLoginAttempts = identifier => {
  loginAttempts.delete(identifier);
};

const createAuthPayload = ({ sessionId, userName }) => {
  const accessToken = createAccessToken({ sessionId, userName });

  return {
    accessToken: accessToken.token,
    accessTokenExpiresAt: accessToken.expiresAt,
    user: {
      username: userName,
    },
  };
};

module.exports = {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  validateAdminCredentials,
  createRefreshTokenRecord,
  createAccessToken,
  createAuthPayload,
  serializeRefreshCookie,
  clearRefreshCookie,
  getRefreshCookiePayload,
  hashRefreshToken,
  isSessionActive,
  verifyAccessToken,
  isAllowedOrigin,
  assertLoginAttemptAllowed,
  recordFailedLoginAttempt,
  clearLoginAttempts,
};
