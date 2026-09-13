import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bridge=fs.readFileSync(new URL('../src/human-bridge.js',import.meta.url),'utf8');
const telegram=fs.readFileSync(new URL('../src/telegram.js',import.meta.url),'utf8');

test('v1.31.2 pre-acks Telegram callback batch before slow workers',()=>{
  const get=bridge.indexOf('const updates=await tg.getUpdates');
  const pre=bridge.indexOf('await preAckCallbackBatch(updates,tg)');
  const work=bridge.indexOf('await handleUpdatesConcurrent(updates,livechat,8)');
  assert.ok(get>=0 && pre>get && work>pre);
});

test('v1.31.2 callback ACK retries network failures',()=>{
  assert.match(bridge,/async function ackCallbackFast[\s\S]*for\(let i=0;i<3;i\+\+\)[\s\S]*answerCallbackQuery/);
});

test('v1.31.2 successful ticket action removes keyboard after close',()=>{
  const close=bridge.indexOf("await db.closeBridgeTicket(ticket.id,'ANSWERED'");
  const edit=bridge.indexOf('await tg.editMessageReplyMarkup');
  assert.ok(close>=0 && edit>close);
  assert.match(telegram,/async editMessageReplyMarkup\(/);
});
