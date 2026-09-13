import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { detectIntent, normalizeText } from '../src/normalizer.js';
import { detectMemberEmotion, validateContextualReply } from '../src/context-intelligence.js';

test('typo variants normalize into the existing workflows',()=>{
  assert.equal(normalizeText('wdraw blm msk'),'withdraw belum masuk');
  assert.equal(normalizeText('lupapsw'),'lupa password');
  assert.equal(detectIntent('wdraw saya blm msk'),'WITHDRAW_PROBLEM');
  assert.equal(detectIntent('lupapsw bos'),'FORGOT_PASSWORD');
});

test('loss complaint with abuse stays a loss/emotion case instead of deposit or WD',()=>{
  assert.equal(detectIntent('anjing rungkad terus kalah terus'),'LOSS_COMPLAINT');
  assert.equal(detectMemberEmotion('anjing rungkad terus kalah terus','LOSS_COMPLAINT'),'SANGAT_MARAH');
});

test('anti mischat blocks unrelated operational reply',()=>{
  const x=validateContextualReply({
    intent:'WITHDRAW_PROBLEM',
    activeWorkflowIntent:'WITHDRAW_PROBLEM',
    memberText:'wd saya belum masuk',
    reply:'Boleh kirim bukti transfer depositnya bosku?'
  });
  assert.equal(x.ok,false);
  assert.match(x.reason,/context_topic_mismatch/);
});

test('anti mischat allows same-topic operational reply',()=>{
  const x=validateContextualReply({
    intent:'WITHDRAW_PROBLEM',
    activeWorkflowIntent:'WITHDRAW_PROBLEM',
    memberText:'wd saya belum masuk',
    reply:'Withdraw bosku sedang kami cek ya, mohon ditunggu sebentar.'
  });
  assert.equal(x.ok,true);
});

test('loss reply cannot ask unrelated account data',()=>{
  const x=validateContextualReply({
    intent:'LOSS_COMPLAINT',
    activeWorkflowIntent:'LOSS_COMPLAINT',
    memberText:'kalah terus bos',
    reply:'Boleh kirim User ID dan bukti transfernya?'
  });
  assert.equal(x.ok,false);
});

test('legacy operational workflows remain before generic AI path',()=>{
  const src=fs.readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
  const workflow=src.indexOf('const workflowResult=await maybeHandleWorkflow');
  const operational=src.indexOf('const operationalResult=await maybeHandleOperationalFlow');
  const ai=src.indexOf('ai.classifyAndReply');
  assert.ok(workflow>0 && operational>workflow && ai>operational);
});

test('AI emotion and anti-mischat gates are wired without replacing legacy workflow',()=>{
  const src=fs.readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
  assert.match(src,/detectMemberEmotion\(text,intent\)/);
  assert.match(src,/validateContextualReply/);
  assert.match(src,/ANTI_MISCHAT_BLOCKED/);
  assert.match(src,/member-emotion:/);
});
