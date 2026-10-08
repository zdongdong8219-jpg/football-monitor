const LIST_URL = 'http://slb.haoyun999.cn/api/Game/GetSinglePassMatchs';
const DETAIL_URL = 'http://slb.haoyun999.cn/api/Game/GetMoreSpInfo';

const num = value => Number.isFinite(Number(value)) ? Number(value) : null;
const clone = value => JSON.parse(JSON.stringify(value));

async function readJson(fetchImpl, url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

function normalize(match, detail) {
  const more = detail?.data?.footballMoreSpInfo || {};
  return {
    id: Number(match.matchId ?? match.id), number: match.lotteryId ?? match.number,
    league: match.leagueChs ?? match.league, kickoff: match.matchTime ?? match.kickoff,
    home: match.homeChs ?? match.home, away: match.awayChs ?? match.away,
    homeRank: match.homeRank ?? null, awayRank: match.awayRank ?? null,
    saleDate: String(match.saledate ?? match.saleDate ?? '').slice(0, 10),
    spf: { win:num(more.spf_win ?? match.spfWinFoot ?? match.spf?.win), draw:num(more.spf_draw ?? match.spfEqualFoot ?? match.spf?.draw), lose:num(more.spf_lost ?? match.spfLoseFoot ?? match.spf?.lose) },
    handicap: Number(more.rfspf_goal ?? match.goalFoot ?? match.handicap ?? 0),
    rqspf: { win:num(more.rfspf_win ?? match.rspfWinFoot ?? match.rqspf?.win), draw:num(more.rfspf_draw ?? match.rspfEqualFoot ?? match.rqspf?.draw), lose:num(more.rfspf_lost ?? match.rspfLoseFoot ?? match.rqspf?.lose) },
    goals: Object.fromEntries(Array.from({length:8},(_,i)=>[i===7?'7+':String(i),num(more[`t${i}`] ?? match.goals?.[i===7?'7+':String(i)])])),
    single: match.single || { spf:Boolean(match.singleSpfFoot), rqspf:Boolean(match.singleRqspfFoot), score:Boolean(match.singleBfFoot), goals:Boolean(match.singleJqFoot) }
  };
}

function appendDay(state, date, checkedAt, matches) {
  const day = state.days[date] || { date, snapshots: [] };
  const compact = { checkedAt, matches: matches.sort((a,b)=>(a.number||'').localeCompare(b.number||'','zh-CN')) };
  const previous = day.snapshots.at(-1);
  if (!previous || JSON.stringify(previous.matches) !== JSON.stringify(compact.matches)) day.snapshots.push(compact);
  else previous.checkedAt = checkedAt;
  day.snapshots = day.snapshots.slice(-72);
  day.latest = compact;
  state.days[date] = day;
}

export async function collect(previous, { fetchImpl=fetch, now=new Date() }={}) {
  const payload = await readJson(fetchImpl, LIST_URL);
  if (payload?.code !== 0) throw new Error(payload?.message || 'Match list unavailable');
  const listed = (payload.data || []).flatMap(group => Array.isArray(group?.list) ? group.list : []);
  const stored = Object.values(previous?.days || {}).flatMap(day => day.latest?.matches || []);
  const listedIds = new Set(listed.map(item => Number(item.matchId)));
  const pending = stored.filter(item => !listedIds.has(item.id) && Date.parse(item.kickoff) > now.getTime() && Date.parse(item.kickoff) < now.getTime()+36*60*60*1000);
  const source = [...listed, ...pending];
  const details = await Promise.all(source.map(item => readJson(fetchImpl, `${DETAIL_URL}?matchId=${encodeURIComponent(item.matchId ?? item.id)}&matchType=0`).catch(()=>null)));
  const matches = source.map((item,index)=>normalize(item,details[index]));
  const state = previous && typeof previous==='object' ? clone(previous) : { version:1, days:{} };
  state.version=1; state.status='ready'; state.checkedAt=now.toISOString(); state.days ||= {};
  const groups = Object.groupBy(matches, item => item.saleDate || now.toISOString().slice(0,10));
  for (const [date,rows] of Object.entries(groups)) appendDay(state,date,state.checkedAt,rows);
  const currentDate=listed[0]?.saledate?.slice(0,10) || Object.keys(groups).sort().at(-1) || now.toISOString().slice(0,10);
  state.currentDate=currentDate;
  for(const date of Object.keys(state.days).sort().slice(0,-35)) delete state.days[date];
  return state;
}

export { appendDay, normalize };
