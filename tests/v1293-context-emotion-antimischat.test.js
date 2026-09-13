import test from 'node:test';
import assert from 'node:assert/strict';
import { detectIntent } from '../src/normalizer.js';
import { detectEmotion, replyTopicConflict, asksForbiddenForgotPasswordId, lossReplyForEmotion } from '../src/conversation-intelligence.js';
import { validateProDecision } from '../src/response-validator.js';

test('workflow lama tetap menang walau typo dan emosi',()=>{
  assert.equal(detectIntent('wd blm msk anjing'),'WITHDRAW_PROBLEM');
  assert.equal(detectIntent('depo blm msk bos'),'DEPOSIT_PROBLEM');
  assert.equal(detectIntent('lpa psw bos'),'FORGOT_PASSWORD');
  assert.equal(detectIntent('rungkad trus anjing'),'LOSS_COMPLAINT');
});

test('emotion layer tidak mengubah intent operasional',()=>{
  assert.equal(detectEmotion('wd lama kali anjing'),'KASAR');
  assert.equal(detectEmotion('rungkad terus bos'),'MARAH');
  assert.equal(detectEmotion('bingung ini gimana bos'),'BINGUNG');
});

test('anti-mischat mendeteksi reply keluar topik',()=>{
  assert.equal(replyTopicConflict('WITHDRAW_PROBLEM','Deposit bosku sedang kami cek'),'reply_switched_to_deposit');
  assert.equal(replyTopicConflict('DEPOSIT_PROBLEM','Withdraw bosku sedang kami proses'),'reply_switched_to_withdraw');
  assert.equal(replyTopicConflict('WITHDRAW_PROBLEM','Withdraw bosku masih dalam proses'),null);
});

test('forgot password tetap tidak boleh minta user ID',()=>{
  assert.equal(asksForbiddenForgotPasswordId('Boleh kirim User ID bosku?'),true);
  const out=validateProDecision({intent:'FORGOT_PASSWORD',decision:{action:'ASK_INFO',confidence:.99,reply:'Boleh kirim User ID bosku?',reason:'x'},brain:{missingInfo:['rekening']},hasKnowledge:true});
  assert.equal(out.action,'ASK_HUMAN');
  assert.match(out.reason,/forgot_password_user_id_forbidden/);
});

test('loss complaint punya respons de-eskalasi tanpa dorongan mengejar kalah',()=>{
  const r=lossReplyForEmotion('KASAR');
  assert.match(r,/paham/i);
  assert.match(r,/jangan dipaksakan|berhenti|istirahat/i);
  assert.doesNotMatch(r,/pasti menang|balik modal|kejar|gacor|rtp/i);
});
