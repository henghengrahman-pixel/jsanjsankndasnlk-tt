import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LiveChatClient } from '../src/livechat.js';

const poller=fs.readFileSync(new URL('../src/poller.js',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
const db=fs.readFileSync(new URL('../src/db.js',import.meta.url),'utf8');
const bridge=fs.readFileSync(new URL('../src/human-bridge.js',import.meta.url),'utf8');
const telegram=fs.readFileSync(new URL('../src/telegram.js',import.meta.url),'utf8');

test('v1.31.6 LiveChat terminal summaries never remain in AI active inbox',()=>{
  const c=new LiveChatClient({base:'x',accountId:'a',pat:'b'});
  const items=[
    {id:'active',is_followed:true,last_thread_summary:{active:true}},
    {id:'closed-followed',is_followed:true,status:'closed'},
    {id:'archived-followed',is_followed:true,routing_status:'archived'},
    {id:'inactive-followed',is_followed:true,last_thread_summary:{active:false}}
  ];
  assert.deepEqual(c.filterInbox(items).map(x=>x.id),['active']);
});

test('v1.31.6 poller mirrors explicit LiveChat close locally in same sync',()=>{
  assert.match(poller,/st\.terminal \|\| st\.active===false/);
  assert.match(poller,/markConversationEnded\(String\(summary\.id\)\)/);
  assert.match(poller,/summaryFingerprints\.delete\(String\(summary\.id\)\)/);
});

test('v1.31.6 API inbox has terminal-state guard and End Chat still closes provider first',()=>{
  assert.match(server,/COALESCE\(c\.status,'active'\)<>'closed'/);
  assert.match(server,/COALESCE\(c\.lc_active,true\)<>false/);
  assert.match(server,/lc\.endChat\(req\.params\.id\)[\s\S]*markConversationEnded\(req\.params\.id\)/);
  assert.match(db,/status='closed',visible_in_inbox=false,lc_active=false,lc_routing_status='closed'/);
});

test('v1.31.6 Telegram buttons self-heal webhook conflicts and single-owner polling',()=>{
  assert.match(telegram,/async getWebhookInfo\(\)/);
  assert.match(bridge,/ensureTelegramPollingTransport/);
  assert.match(bridge,/TELEGRAM_WEBHOOK_STILL_ACTIVE/);
  assert.match(bridge,/tryAcquireProcessLock\('livechat_ai:telegram_bridge_poll'\)/);
  assert.match(db,/pg_try_advisory_lock/);
  assert.match(bridge,/preAckCallbackBatch\(updates,tg\)/);
});
