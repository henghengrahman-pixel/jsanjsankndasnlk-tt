import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('../src/server.js', import.meta.url),'utf8');
test('2FA enrollment is bound to TOTP secret fingerprint',()=>{
  assert.match(server,/admin_2fa_secret_fingerprint/);
  assert.match(server,/totpSecretFingerprint/);
  assert.match(server,/storedFingerprint===currentFingerprint/);
  assert.match(server,/setSetting\('admin_2fa_secret_fingerprint'/);
});
