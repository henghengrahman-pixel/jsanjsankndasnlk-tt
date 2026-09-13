import crypto from 'node:crypto';

export function normalizeTotpSecret(value=''){
  return String(value||'').toUpperCase().replace(/[^A-Z2-7]/g,'');
}

export function isPlaceholderTotpSecret(value=''){
  const raw=String(value||'').trim().toUpperCase();
  if(!raw) return false;
  return /(PASTE|REPLACE|CHANGE|EXAMPLE|YOUR[_ -]?SECRET|SECURITY[_ -]?SETUP|SECRET[_ -]?HERE|BASE32SECRET)/.test(raw);
}

export function isUsableTotpSecret(value=''){
  const normalized=normalizeTotpSecret(value);
  return normalized.length>=16 && !isPlaceholderTotpSecret(value);
}

export function generateTotpSecret(bytes=20){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const input=crypto.randomBytes(Math.max(16,Number(bytes)||20));
  let bits='';
  for(const b of input) bits+=b.toString(2).padStart(8,'0');
  let out='';
  for(let i=0;i<bits.length;i+=5){
    const chunk=bits.slice(i,i+5).padEnd(5,'0');
    out+=alphabet[parseInt(chunk,2)];
  }
  return out;
}
