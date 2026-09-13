import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('v1.31.4 forces QR stage before accepting first enrollment OTP',()=>{
  assert.match(server,/setupConfirm=false/);
  assert.match(server,/!enrolled && setupConfirm!==true/);
  assert.match(server,/TWO_FACTOR_SETUP_INVALID/);
  assert.match(server,/setupPayload/);
});

test('v1.31.4 UI clears stale OTP and explicitly confirms setup stage',()=>{
  assert.match(ui,/twoFaSetupMode=false/);
  assert.match(ui,/\$\('#otp'\)\.value=''/);
  assert.match(ui,/setupConfirm:twoFaSetupMode/);
  assert.match(ui,/TWO_FACTOR_SETUP_INVALID/);
});
