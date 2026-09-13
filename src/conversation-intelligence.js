import { normalizeText } from './normalizer.js';

const PROFANITY=/(kontol|goblok|bodoh|bangsat|anjing|babi|tolol|kampret|sialan|tai|asu)/i;
const LOSS=/\b(kalah|rungkad|rugi|boncos|ga pernah menang|gak pernah menang|tidak pernah menang|ga pernah jp|gak pernah jp|tidak pernah jp)\b/i;

export function detectEmotion(text=''){
  const raw=String(text||'');
  const t=normalizeText(raw);
  if(!t) return 'NORMAL';
  if(PROFANITY.test(raw) || /\b(marah banget|emosi banget|kesel banget|kesal banget)\b/i.test(t)) return 'KASAR';
  if(/\b(marah|emosi|kesal|kesel|kecewa|parah|capek|muak)\b/i.test(t) || (LOSS.test(t) && /\b(terus|lagi|selalu|mulu)\b/i.test(t))) return 'MARAH';
  if(/\b(bingung|maksudnya|gimana|bagaimana|kok bisa|kenapa)\b/i.test(t)) return 'BINGUNG';
  if(/\b(segera|cepat|buruan|urgent|lama kali|kelamaan)\b/i.test(t)) return 'BURU_BURU';
  if(LOSS.test(t)) return 'KESAL';
  return 'NORMAL';
}

export function hasLossContext(text=''){
  return LOSS.test(normalizeText(text));
}

export function replyTopicConflict(intent='GENERAL',reply=''){
  const i=String(intent||'GENERAL').toUpperCase();
  const t=normalizeText(reply);
  if(!t) return null;
  const hasDp=/\bdeposit\b/.test(t);
  const hasWd=/\b(withdraw|penarikan)\b/.test(t);
  const hasReset=/\b(password|sandi|reset password)\b/.test(t);
  const hasBonus=/\bbonus\b/.test(t);
  const hasLoss=/\b(kalah|rungkad|rugi|boncos)\b/.test(t);

  if(i==='WITHDRAW_PROBLEM' && hasDp && !hasWd) return 'reply_switched_to_deposit';
  if(i==='DEPOSIT_PROBLEM' && hasWd && !hasDp) return 'reply_switched_to_withdraw';
  if(i==='FORGOT_PASSWORD' && (hasDp||hasWd||hasBonus) && !hasReset) return 'reply_left_password_flow';
  if(i==='LOSS_COMPLAINT' && (hasDp||hasWd||hasReset||hasBonus) && !hasLoss) return 'reply_left_loss_context';
  return null;
}

export function asksForbiddenForgotPasswordId(reply=''){
  const t=normalizeText(reply);
  return /\b(user id|userid|id akun|id member|username)\b/.test(t);
}

export function lossReplyForEmotion(emotion='KESAL'){
  const e=String(emotion||'KESAL').toUpperCase();
  if(['KASAR','MARAH'].includes(e)){
    return 'Saya paham bosku lagi kesal karena hasil permainan belum sesuai harapan 🙏 Kalau sudah bikin emosi, sebaiknya jangan dipaksakan dulu ya bosku. Istirahat sebentar dulu; kalau ada kendala teknis atau transaksi yang perlu dicek, bilang saja dan kami bantu.';
  }
  return 'Saya paham bosku lagi kecewa karena hasil permainan belum sesuai harapan 🙏 Kalau sudah terasa tidak nyaman, lebih baik berhenti dulu sebentar ya bosku. Kalau ada kendala teknis atau transaksi yang mau dicek, kami siap bantu.';
}
