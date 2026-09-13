import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

test('v1.31.0 security middleware and 2FA wiring are present',()=>{
  const server=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
  const auth=fs.readFileSync(new URL('../src/auth.js',import.meta.url),'utf8');
  const ui=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(server,/requireCsrf/);
  assert.match(server,/Strict-Transport-Security/);
  assert.match(server,/Content-Security-Policy/);
  assert.match(server,/SameSite=Strict/);
  assert.match(server,/loginThrottleStatus/);
  assert.match(auth,/verifyTotp/);
  assert.match(auth,/ADMIN_PASSWORD_HASH|adminPasswordHash/);
  assert.match(ui,/X-CSRF-Token/);
  assert.match(ui,/otp/);
});

test('TOTP accepts RFC-compatible 6 digit code and rejects wrong code',()=>{
  const code=`import {verifyTotp} from './src/auth.js'; console.log(JSON.stringify([verifyTotp('287082',process.env.ADMIN_TOTP_SECRET,59000),verifyTotp('000000',process.env.ADMIN_TOTP_SECRET,59000)]));`;
  const out=execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,ADMIN_USERNAME:'admin',ADMIN_PASSWORD:'x',ADMIN_2FA_ENABLED:'true',ADMIN_TOTP_SECRET:'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',SESSION_SECRET:'12345678901234567890123456789012'}}).toString().trim();
  assert.deepEqual(JSON.parse(out),[true,false]);
});
