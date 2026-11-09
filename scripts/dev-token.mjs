// Local-only access tokens for the seed and check-flows, signed like the server
// (auth JwtAccessTokenAdapter: HS256, iss·sub(accountId)·jti·iat·exp·token_use=access).
// The key comes from AUTH_JWT_SECRET/AUTH_JWT_ISSUER or ../server/.env, else the server's local default.
// CLI: node scripts/dev-token.mjs <accountId> prints a 24h token for opening a seeded account by hand.
import { createHmac, randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

let serverEnv = {};
try {
  const text = await readFile(new URL('../../server/.env', import.meta.url), 'utf8');
  serverEnv = Object.fromEntries(text.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*(AUTH_JWT_SECRET|AUTH_JWT_ISSUER)\s*=\s*(.*?)\s*$/);
    return match ? [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]] : [];
  }));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
// Empty values (e.g. `AUTH_JWT_SECRET=`) fall through like unset ones, matching the warning below.
const secret = process.env.AUTH_JWT_SECRET || serverEnv.AUTH_JWT_SECRET || 'local-only-secret-key-with-at-least-32-bytes';
if (!process.env.AUTH_JWT_SECRET && !serverEnv.AUTH_JWT_SECRET) {
  console.warn('dev-token: AUTH_JWT_SECRET is not set and ../server/.env has none; signing with the server\'s local default key.');
}
const issuer = process.env.AUTH_JWT_ISSUER || serverEnv.AUTH_JWT_ISSUER || 'orbit';

export function devAccessToken(accountId, ttlSeconds = 86400) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: 'HS256' })}.${encode({
    iss: issuer, sub: String(accountId), jti: randomUUID(), iat, exp: iat + ttlSeconds, token_use: 'access',
  })}`;
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
}

// Compare real paths so running through a symlink still counts as the CLI. A missing or virtual
// argv[1] (some runners) just means this module was imported, not run.
function isCli() {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
if (isCli()) {
  const accountId = Number(process.argv[2]);
  if (!Number.isInteger(accountId) || accountId <= 0) throw new Error('Usage: node scripts/dev-token.mjs <accountId>');
  console.log(devAccessToken(accountId));
}
