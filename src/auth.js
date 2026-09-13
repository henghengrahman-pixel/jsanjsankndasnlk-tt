import crypto from 'node:crypto';
import { config } from './config.js';
import { normalizeTotpSecret, isUsableTotpSecret } from './totp-secret.js';

function b64url(input) { return Buffer.from(input).toString('base64url'); }
function hmac(input, purpose='session') {
  return crypto.createHmac('sha256', `${purpose}:${config.sessionSecret}`).update(String(input)).digest('base64url');
}
function safeEqualText(a='', b='') {
  const aa=Buffer.from(String(a)); const bb=Buffer.from(String(b));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
}
function uaHash(req){
  if(!req) return '';
  const ua=String(req.headers?.['user-agent']||'').slice(0,512);
  return ua?hmac(ua,'ua').slice(0,32):'';
}

export function safeUsernameEqual(input='') {
  return safeEqualText(String(input), String(config.adminUsername));
}

export async function verifyAdminPassword(input='') {
  const plain=String(input||'');
  const encoded=String(config.adminPasswordHash||'').trim();
  if(encoded){
    const parts=encoded.split('$');
    // scrypt$N$r$p$salt_b64url$hash_b64url
    if(parts.length!==6 || parts[0]!=='scrypt') return false;
    const N=Number(parts[1]), r=Number(parts[2]), p=Number(parts[3]);
    if(!Number.isInteger(N)||!Number.isInteger(r)||!Number.isInteger(p)||N<1024||N>1048576||r<1||p<1) return false;
    let salt, expected;
    try{salt=Buffer.from(parts[4],'base64url');expected=Buffer.from(parts[5],'base64url');}catch{return false;}
    if(salt.length<16||expected.length<32) return false;
    const derived=await new Promise((resolve,reject)=>crypto.scrypt(plain,salt,expected.length,{N,r,p,maxmem:128*1024*1024},(e,key)=>e?reject(e):resolve(key))).catch(()=>null);
    return Boolean(derived)&&derived.length===expected.length&&crypto.timingSafeEqual(derived,expected);
  }
  // Backward-compatible fallback. ADMIN_PASSWORD_HASH is recommended for production.
  const expected=String(config.adminPassword||'');
  if(!expected) return false;
  return safeEqualText(plain,expected);
}

function decodeBase32(value=''){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean=normalizeTotpSecret(value);
  let bits='';
  for(const c of clean){const i=alphabet.indexOf(c);if(i<0)continue;bits+=i.toString(2).padStart(5,'0');}
  const out=[];
  for(let i=0;i+8<=bits.length;i+=8)out.push(parseInt(bits.slice(i,i+8),2));
  return Buffer.from(out);
}
function hotp(secret,counter,digits=6){
  const c=Buffer.alloc(8); c.writeBigUInt64BE(BigInt(counter));
  const h=crypto.createHmac('sha1',secret).update(c).digest();
  const o=h[h.length-1]&15;
  const n=((h[o]&127)<<24)|((h[o+1]&255)<<16)|((h[o+2]&255)<<8)|(h[o+3]&255);
  return String(n%(10**digits)).padStart(digits,'0');
}
export function verifyTotp(code='', secretValue=config.adminTotpSecret, now=Date.now()){
  if(!config.admin2faEnabled) return true;
  if(!isUsableTotpSecret(secretValue)) return false;
  const normalized=String(code||'').replace(/\s+/g,'');
  if(!/^\d{6}$/.test(normalized)) return false;
  const secret=decodeBase32(secretValue);
  if(secret.length<10) return false;
  const step=Math.floor(now/30000);
  for(let w=-1;w<=1;w++) if(safeEqualText(normalized,hotp(secret,step+w))) return true;
  return false;
}

export function createSession(username, req=null) {
  const now=Date.now();
  const ttl=Math.max(1,Number(config.adminSessionHours)||8)*3600_000;
  const body = b64url(JSON.stringify({u:String(username),sid:crypto.randomBytes(18).toString('base64url'),iat:now,exp:now+ttl,ua:uaHash(req)}));
  return `${body}.${hmac(body,'session')}`;
}
export function verifySession(token='', req=null) {
  const [body, sig] = String(token).split('.');
  if (!body || !sig || !config.sessionSecret) return null;
  const expected = hmac(body,'session');
  if (!safeEqualText(sig,expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!data.exp || data.exp < Date.now() || !data.sid || data.u!==config.adminUsername) return null;
    if(data.ua && req && !safeEqualText(data.ua,uaHash(req))) return null;
    return data;
  } catch { return null; }
}
export function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(raw.split(';').map(v => v.trim()).filter(Boolean).map(v => {
    const i = v.indexOf('=');
    let k=i>=0?v.slice(0,i):v, val=i>=0?v.slice(i+1):'';
    try{k=decodeURIComponent(k);val=decodeURIComponent(val);}catch{}
    return [k,val];
  }));
}
export function getSessionToken(req){return parseCookies(req).lcai_session||'';}
export function csrfTokenForSession(token=''){return token?hmac(token,'csrf'):'';}
export function requireAdmin(req, res, next) {
  const token=getSessionToken(req);
  const session = verifySession(token,req);
  if (!session) return res.status(401).json({ ok:false, error:'UNAUTHORIZED' });
  req.admin = session; req.adminSessionToken=token;
  next();
}
export function requireCsrf(req,res,next){
  if(['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  if(req.path==='/login') return next();
  const token=getSessionToken(req); const session=verifySession(token,req);
  if(!session) return res.status(401).json({ok:false,error:'UNAUTHORIZED'});
  const supplied=String(req.headers['x-csrf-token']||'');
  const expected=csrfTokenForSession(token);
  if(!supplied||!safeEqualText(supplied,expected)) return res.status(403).json({ok:false,error:'CSRF_FAILED'});
  next();
}

const attempts=new Map();
function attemptKey(req,username=''){
  const ip=String(req.ip||req.socket?.remoteAddress||'unknown').slice(0,128);
  return hmac(`${ip}|${String(username).toLowerCase().slice(0,128)}`,'login-key').slice(0,40);
}
export function loginThrottleStatus(req,username=''){
  const key=attemptKey(req,username), now=Date.now(), row=attempts.get(key);
  if(!row) return {allowed:true,key,retryAfter:0};
  if(row.lockedUntil&&row.lockedUntil>now) return {allowed:false,key,retryAfter:Math.max(1,Math.ceil((row.lockedUntil-now)/1000))};
  if(now-row.firstAt>10*60_000){attempts.delete(key);return {allowed:true,key,retryAfter:0};}
  return {allowed:true,key,retryAfter:0};
}
export function recordLoginFailure(req,username=''){
  const key=attemptKey(req,username), now=Date.now();
  let row=attempts.get(key);
  if(!row||now-row.firstAt>10*60_000) row={count:0,firstAt:now,lockedUntil:0};
  row.count++;
  if(row.count>=5) row.lockedUntil=now+15*60_000;
  attempts.set(key,row);
  return {count:row.count,lockedUntil:row.lockedUntil};
}
export function clearLoginFailures(req,username=''){attempts.delete(attemptKey(req,username));}
