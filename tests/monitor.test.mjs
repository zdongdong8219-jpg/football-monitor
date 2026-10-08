import test from 'node:test';
import assert from 'node:assert/strict';
import { appendDay, buildResearchSnapshot } from '../scripts/monitor-core.mjs';

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

test('research snapshot preserves opening and current odds',()=>{
  const state={checkedAt:'2026-10-08T05:30:00Z',currentDate:'2026-10-08',days:{}};
  appendDay(state,'2026-10-08','2026-10-08T00:00:00Z',[{id:1,number:'周四001',home:'主队',away:'客队',spf:{win:1.5,draw:4,lose:6},handicap:-1,rqspf:{win:2.5,draw:3.2,lose:2.4},goals:{'2':3.5}}]);
  appendDay(state,'2026-10-08',state.checkedAt,[{id:1,number:'周四001',home:'主队',away:'客队',spf:{win:1.4,draw:4.1,lose:6.2},handicap:-1,rqspf:{win:2.4,draw:3.2,lose:2.5},goals:{'2':3.4}}]);
  const snapshot=buildResearchSnapshot(state);
  assert.equal(snapshot.matches[0].spfOpen.win,1.5);
  assert.equal(snapshot.matches[0].spfNow.win,1.4);
  assert.equal(snapshot.matches[0].spfDelta.win,-0.1);
  assert.equal(snapshot.beijingTime,'2026-10-08 13:30');
});
