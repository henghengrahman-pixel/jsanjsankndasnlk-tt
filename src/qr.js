import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const QRCode=require('./vendor/qrcode/index.js');
const QRErrorCorrectLevel=require('./vendor/qrcode/QRErrorCorrectLevel.js');

export function totpUri({secret,username='admin',issuer='LiveChat AI'}={}){
  const s=String(secret||'').toUpperCase().replace(/[^A-Z2-7]/g,'');
  if(s.length<16) throw new Error('TOTP_SECRET_INVALID');
  const label=`${issuer}:${username}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(s)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function qrSvg(text,{size=240,margin=4}={}){
  const qr=new QRCode(-1,QRErrorCorrectLevel.M);
  qr.addData(String(text||''));
  qr.make();
  const count=qr.getModuleCount();
  const full=count+margin*2;
  const cell=Math.max(1,Math.floor(size/full));
  const actual=cell*full;
  let path='';
  for(let r=0;r<count;r++){
    for(let c=0;c<count;c++){
      if(qr.isDark(r,c)) path+=`M${(c+margin)*cell} ${(r+margin)*cell}h${cell}v${cell}h-${cell}z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${actual} ${actual}" width="${size}" height="${size}" role="img" aria-label="QR Code 2FA"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
