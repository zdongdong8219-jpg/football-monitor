import test from 'node:test';
import assert from 'node:assert/strict';
import { appendDay, buildResearchSnapshot, normalize } from '../scripts/monitor-core.mjs';

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

test('normalizes all nine half-full-time outcomes',()=>{
  const match={matchId:1,lotteryId:'周四001',saledate:'2026-10-08'};
  const detail={data:{footballMoreSpInfo:{ht33:2.1,ht31:18,ht30:50,ht13:4.15,ht11:7.25,ht10:13.5,ht03:23,ht01:18,ht00:10,singlebqc:true}}};
  const result=normalize(match,detail);
  assert.deepEqual(result.halfFull,{winWin:2.1,winDraw:18,winLose:50,drawWin:4.15,drawDraw:7.25,drawLose:13.5,loseWin:23,loseDraw:18,loseLose:10});
  assert.equal(result.single.halfFull,true);
});
