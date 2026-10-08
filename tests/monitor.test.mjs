import test from 'node:test';
import assert from 'node:assert/strict';
import { appendDay } from '../scripts/monitor-core.mjs';

test('unchanged odds do not create duplicate snapshots',()=>{
  const state={days:{}}; const matches=[{id:1,number:'周四001',spf:{win:1.5}}];
  appendDay(state,'2026-10-08','2026-10-08T00:00:00Z',matches);
  appendDay(state,'2026-10-08','2026-10-08T00:30:00Z',matches);
  assert.equal(state.days['2026-10-08'].snapshots.length,1);
  assert.equal(state.days['2026-10-08'].latest.checkedAt,'2026-10-08T00:30:00Z');
});

test('changed odds create a historical snapshot',()=>{
  const state={days:{}};
  appendDay(state,'2026-10-08','2026-10-08T00:00:00Z',[{id:1,number:'周四001',spf:{win:1.5}}]);
  appendDay(state,'2026-10-08','2026-10-08T00:30:00Z',[{id:1,number:'周四001',spf:{win:1.4}}]);
  assert.equal(state.days['2026-10-08'].snapshots.length,2);
});
