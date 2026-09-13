import { normalizeText } from './normalizer.js';

const ORDER={NORMAL:0,BINGUNG:1,KECEWA:2,MARAH:3,SANGAT_MARAH:4};

export function detectMemberEmotion(text='', intent='GENERAL'){
  const n=normalizeText(text);
  let emotion='NORMAL';

  if(/\b(?:bingung|gimana|bagaimana|kok bisa|maksudnya|ga ngerti|tidak ngerti)\b/i.test(n)) emotion='BINGUNG';
  if(/\b(?:kecewa|sedih|capek|cape|rungkad|boncos|rugi|kalah terus|kalah lagi)\b/i.test(n)) emotion='KECEWA';
  if(/\b(?:kesal|kesel|marah|lama kali|lama banget|parah|payah|ga beres|tidak beres)\b/i.test(n)) emotion='MARAH';
  if(/\b(?:kontol|bangsat|anjing|babi|goblok|tolol|bodoh|tai|fuck|asu)\b/i.test(n)) emotion='SANGAT_MARAH';

  if(String(intent||'').toUpperCase()==='LOSS_COMPLAINT' && ORDER[emotion] < ORDER.KECEWA) emotion='KECEWA';
  return emotion;
}

const TOPIC_PATTERNS={
  DEPOSIT: /\b(?:deposit|depo|bukti transfer|transfer deposit|qris|barcode)\b/i,
  WITHDRAW: /\b(?:withdraw|wd|penarikan)\b/i,
  PASSWORD: /\b(?:password|sandi|reset password|lupa password)\b/i,
  BONUS: /\b(?:bonus|freebet|ronda|rollingan|cashback)\b/i,
  REGISTER: /\b(?:daftar|registrasi|register|buat akun)\b/i,
  LOSS: /\b(?:kalah|rungkad|boncos|rugi|permainan)\b/i
};

function expectedTopic(intent='GENERAL'){
  const x=String(intent||'GENERAL').toUpperCase();
  if(x.startsWith('DEPOSIT')) return 'DEPOSIT';
  if(x.startsWith('WITHDRAW')) return 'WITHDRAW';
  if(['FORGOT_PASSWORD','RESET_PASSWORD'].includes(x)) return 'PASSWORD';
  if(x.startsWith('BONUS')) return 'BONUS';
  if(x.startsWith('REGISTER')) return 'REGISTER';
  if(x==='LOSS_COMPLAINT') return 'LOSS';
  return '';
}

export function validateContextualReply({intent='GENERAL',reply='',memberText='',activeWorkflowIntent=''}) {
  const text=String(reply||'').trim();
  if(!text) return {ok:true};

  const expected=expectedTopic(activeWorkflowIntent||intent);
  if(!expected) return {ok:true};

  // Only block a reply when it strongly introduces a *different operational flow*.
  // Generic words like "saldo", "cek", "akun", "kendala" are intentionally ignored.
  const mentioned=Object.entries(TOPIC_PATTERNS)
    .filter(([_,rx])=>rx.test(text))
    .map(([k])=>k);

  const foreign=mentioned.filter(x=>x!==expected);
  const expectedMentioned=mentioned.includes(expected);

  if(foreign.length && !expectedMentioned){
    return {
      ok:false,
      reason:`context_topic_mismatch:${expected}->${foreign.join(',')}`,
      expected,
      foreign
    };
  }

  // Loss complaints must not be answered with operational data collection unless the
  // member explicitly changed topic in the same message.
  if(expected==='LOSS'){
    const member=normalizeText(memberText);
    const explicitSwitch=/(deposit|withdraw|wd|password|bonus|daftar|register)/i.test(member);
    if(!explicitSwitch && /\b(?:user id|userid|bukti transfer|nomor rekening|atas nama rekening)\b/i.test(text)){
      return {ok:false,reason:'loss_reply_requests_unrelated_operational_data',expected:'LOSS'};
    }
  }

  return {ok:true};
}

export function emotionInstruction(emotion='NORMAL'){
  switch(String(emotion||'NORMAL').toUpperCase()){
    case 'SANGAT_MARAH': return 'Member sangat marah/kasar. Balas singkat, tenang, jangan defensif, jangan membalas makian.';
    case 'MARAH': return 'Member sedang marah/kesal. Akui kendalanya secara singkat lalu fokus ke solusi sesuai konteks.';
    case 'KECEWA': return 'Member kecewa. Gunakan nada empatik tanpa janji hasil atau kemenangan.';
    case 'BINGUNG': return 'Member bingung. Jelaskan sederhana dan jangan menambah pertanyaan yang tidak perlu.';
    default: return 'Gunakan nada CS natural dan langsung ke inti.';
  }
}
