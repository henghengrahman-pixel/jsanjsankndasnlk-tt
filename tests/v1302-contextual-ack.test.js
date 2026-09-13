import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const engine=fs.readFileSync(new URL('../src/engine.js', import.meta.url),'utf8');

test('v1.30.2 contextual acknowledgement understands active workflow state',()=>{
  assert.match(engine,/function contextualAckReply/);
  assert.match(engine,/Depositnya masih kami lanjut cek/);
  assert.match(engine,/Withdrawnya masih kami lanjut cek\/proses/);
  assert.match(engine,/Permintaan resetnya masih kami lanjut cek/);
  assert.match(engine,/Bonusnya masih kami lanjut cek/);
});

test('v1.30.2 gratitude and acknowledgement preserve existing workflow',()=>{
  assert.match(engine,/contextual_gratitude_preserves_operational_workflow/);
  assert.match(engine,/contextual_acknowledgement_preserves_operational_workflow/);
  assert.match(engine,/workflowPreserved:true,contextual:true/);
});

test('v1.30.2 fresh problem after gratitude is not swallowed',()=>{
  assert.match(engine,/makasih, tapi WD saya belum masuk/);
  assert.match(engine,/Keep this intentionally strict/);
});
