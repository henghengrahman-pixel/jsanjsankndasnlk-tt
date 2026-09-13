import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('poller recovers persisted member messages that have no AI reply',()=>{
  const poller=fs.readFileSync(new URL('../src/poller.js',import.meta.url),'utf8');
  assert.match(poller,/listConversationsNeedingAIReply\(20\)/);
  assert.match(poller,/resumeUnansweredConversation/);
  assert.match(poller,/poller_no_silent_recovery/);
});

test('recovery query excludes Human Takeover and requires newer member event',()=>{
  const db=fs.readFileSync(new URL('../src/db.js',import.meta.url),'utf8');
  assert.match(db,/COALESCE\(c\.handling_mode,'AI'\)<>'HUMAN'/);
  assert.match(db,/c\.last_member_event_at>c\.last_ai_event_at/);
});

test('recovery does not duplicate reply when a later AI or agent reply exists',()=>{
  const engine=fs.readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
  assert.match(engine,/latest_customer_already_answered/);
  assert.match(engine,/\['ai','agent'\]\.includes/);
});
