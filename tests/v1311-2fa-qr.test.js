import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {totpUri,qrSvg} from '../src/qr.js';

test('v1.31.1 creates local TOTP QR SVG without third-party QR service',()=>{
  const uri=totpUri({secret:'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',username:'admin',issuer:'LiveChat AI'});
  assert.match(uri,/^otpauth:\/\/totp\//);
  assert.match(uri,/secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP/);
  const svg=qrSvg(uri,{size:260});
  assert.match(svg,/^<svg/);
  assert.match(svg,/<path/);
});

test('first enrollment is password-gated and confirms OTP before marking enrolled',()=>{
  const server=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
  assert.match(server,/TWO_FACTOR_SETUP_REQUIRED/);
  assert.match(server,/userOk\|\|!passOk/);
  assert.match(server,/admin_2fa_enrolled/);
  assert.match(server,/verifyTotp\(otpValue,config\.adminTotpSecret\)/);
  assert.match(server,/setSetting\('admin_2fa_enrolled',true\)/);
});

test('login UI has QR enrollment panel',()=>{
  const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  const ui=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(html,/id="twoFaQr"/);
  assert.match(html,/Aktifkan 2FA/);
  assert.match(ui,/showTwoFaSetup/);
  assert.match(ui,/TWO_FACTOR_SETUP_REQUIRED/);
});
