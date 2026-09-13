import crypto from 'node:crypto';

const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(buf){
  let bits=''; for(const b of buf)bits+=b.toString(2).padStart(8,'0');
  let out=''; for(let i=0;i<bits.length;i+=5){const chunk=bits.slice(i,i+5).padEnd(5,'0');out+=alphabet[parseInt(chunk,2)];}
  return out;
}
function scryptHash(password){
  const N=16384,r=8,p=1,salt=crypto.randomBytes(16);
  return new Promise((resolve,reject)=>crypto.scrypt(password,salt,64,{N,r,p,maxmem:128*1024*1024},(e,key)=>e?reject(e):resolve(`scrypt$${N}$${r}$${p}$${salt.toString('base64url')}$${key.toString('base64url')}`)));
}
const secret=base32(crypto.randomBytes(20));
const user=process.env.ADMIN_USERNAME||'admin';
const issuer=process.env.ADMIN_2FA_ISSUER||'LiveChat AI';
console.log('ADMIN_2FA_ENABLED=true');
console.log(`ADMIN_TOTP_SECRET=${secret}`);
console.log('Authenticator URI:');
console.log(`otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`);
if(process.env.ADMIN_PASSWORD_INPUT){
  console.log('ADMIN_PASSWORD_HASH='+(await scryptHash(process.env.ADMIN_PASSWORD_INPUT)));
  console.log('Setelah ADMIN_PASSWORD_HASH aktif, ADMIN_PASSWORD boleh dihapus.');
}else{
  console.log('Opsional password hash: jalankan ADMIN_PASSWORD_INPUT="password-baru" npm run security:setup');
}
