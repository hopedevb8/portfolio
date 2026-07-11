const crypto = require('node:crypto');

const password = process.argv[2] || process.env.ADMIN_PASSWORD_TO_HASH || '';

if (!password) {
  console.error('Usage: node scripts/hash-admin-password.cjs "<password>"');
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');

console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt}:${hash}`);
