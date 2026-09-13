import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateTotpSecret, isUsableTotpSecret, normalizeTotpSecret } from '../src/totp-secret.js';

test('v1.31.5 rejects setup placeholders as real TOTP secrets',()=>{
  assert.equal(isUsableTotpSecret('PASTE_BASE32_SECRET_FROM_NPM_RUN_SECURITY_SETUP'),false);
  assert.equal(isUsableTotpSecret('REPLACE_WITH_YOUR_SECRET'),false);
});

test('v1.31.5 generates valid stable-format Base32 TOTP secrets',()=>{
  const s=generateTotpSecret(20);
  assert.match(s,/^[A-Z2-7]{32}$/);
  assert.equal(normalizeTotpSecret(s),s);
  assert.equal(isUsableTotpSecret(s),true);
});

test('v1.31.5 boot resolves missing/placeholder TOTP secret from encrypted DB or generates one',()=>{
  const server=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
  assert.match(server,/ensureAdminTotpSecret/);
  assert.match(server,/admin_2fa_secret_enc/);
  assert.match(server,/encryptSecret\(stored\)/);
  assert.match(server,/generateTotpSecret\(20\)/);
  assert.match(server,/setSetting\('admin_2fa_enrolled',false\)/);
  assert.match(server,/await ensureAdminTotpSecret\(\)/);
});

