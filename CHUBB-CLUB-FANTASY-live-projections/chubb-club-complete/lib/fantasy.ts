import {currentWeek,getPlayers} from './players';
import type {Player} from './types';

export type Scoring='ppr'|'half'|'standard';
export type FantasyLine={
  player_id:string;
  stats:Record<string,number>;
  pts_ppr?:number;
  pts_half_ppr?:number;
  pts_std?:number;
  source?:string;
  hasProjection?:boolean;
};
export type PlayerMetric={player:Player;projection:number;seasonPoints:number;average:number;last:number;value:number;rank:number;positionRank:number;source:string;projectionSource:string;opponent?:string;home?:boolean;gameDate?:string;gameStatus?:string;matchupRank?:number;matchupLabel?:string;matchupTone?:'good'|'neutral'|'bad'};

// Sleeper's normal public player/trending API uses api.sleeper.app. Its projection/stat
// feed is served from api.sleeper.com. Keeping these separate fixes the old 0.0 issue.
const SLEEPER_PUBLIC='https://api.sleeper.app';
const SLEEPER_DATA='https://api.sleeper.com';
const num=(v:any)=>Number.isFinite(Number(v))?Number(v):0;
const optionalNum=(v:any)=>v===undefined||v===null||v===''?undefined:(Number.isFinite(Number(v))?Number(v):undefined);

function normalize(raw:any,source='Sleeper'):FantasyLine[]{
  const a=Array.isArray(raw)?raw:Object.entries(raw||{}).map(([id,v]:any)=>({...v,player_id:v?.player_id||id}));
  return a.map((x:any)=>{
    const stats=x.stats||x;
    const ppr=optionalNum(x.pts_ppr??stats?.pts_ppr);
    const half=optionalNum(x.pts_half_ppr??stats?.pts_half_ppr);
    const std=optionalNum(x.pts_std??stats?.pts_std);
    return {player_id:String(x.player_id||x.player?.player_id||''),stats,pts_ppr:ppr,pts_half_ppr:half,pts_std:std,source,hasProjection:ppr!==undefined||half!==undefined||std!==undefined};
  }).filter(x=>x.player_id);
}

async function sleeperData(kind:'stats'|'projections',week?:number){
  const positions=['QB','RB','WR','TE','K'];
  const posQuery=kind==='projections'?'?'+positions.map(p=>`position%5B%5D=${p}`).join('&'):'';
  const urls=[
    `${SLEEPER_DATA}/${kind}/nfl/regular/2026${week?`/${week}`:''}${posQuery}`,
    // fallback for deployments where the data route is mirrored on the app host
    `${SLEEPER_PUBLIC}/${kind}/nfl/regular/2026${week?`/${week}`:''}${posQuery}`
  ];
  for(const url of urls){
    try{
      const r=await fetch(url,{next:{revalidate:kind==='projections'?300:900},headers:{'Accept':'application/json','User-Agent':'ChubbClubFantasy/1.0'}});
      if(!r.ok)continue;
      const rows=normalize(await r.json(),'Sleeper');
      if(rows.length)return rows;
    }catch{}
  }
  return [];
}

type EspnRow={espnId:string;weekly:number;season:number;average:number;last:number};
function findStat(stats:any[],source:number,split:number,week?:number){return stats.find((s:any)=>s.statSourceId===source&&s.statSplitTypeId===split&&(week==null||s.scoringPeriodId===week))}
async function espnFantasy(scoring:Scoring):Promise<EspnRow[]>{
  // Best-effort fallback only. The app does not label a number ESPN unless this feed
  // actually returns a weekly projected total for that player.
  if(scoring==='half'){
    const [ppr,std]=await Promise.all([espnFantasy('ppr'),espnFantasy('standard')]);
    const sm=new Map(std.map(x=>[x.espnId,x]));
    return ppr.map(p=>{const s=sm.get(p.espnId);return {...p,weekly:(p.weekly+(s?.weekly??p.weekly))/2,season:(p.season+(s?.season??p.season))/2,average:(p.average+(s?.average??p.average))/2,last:(p.last+(s?.last??p.last))/2}})
  }
  const leagueDefault=scoring==='ppr'?3:1, week=currentWeek();
  const url=`https://fantasy.espn.com/apis/v3/games/ffl/seasons/2026/segments/0/leaguedefaults/${leagueDefault}?scoringPeriodId=${week}&view=kona_player_info`;
  const filter={players:{limit:2500,filterStatsForSplitTypeIds:{value:[0,1,2]},filterStatsForSourceIds:{value:[0,1]},filterStatsForExternalIds:{value:[2026]},sortPercOwned:{sortPriority:1,sortAsc:false}}};
  try{
    const r=await fetch(url,{headers:{'X-Fantasy-Filter':JSON.stringify(filter),'Accept':'application/json','User-Agent':'Mozilla/5.0'},next:{revalidate:600}});
    if(!r.ok)return[];
    const data=await r.json();
    return (data.players||[]).map((entry:any)=>{
      const p=entry.player||entry.playerPoolEntry?.player||entry.playerPoolEntry||{};
      const stats=Array.isArray(p.stats)?p.stats:[];
      const weekly=findStat(stats,1,1,week)||stats.find((s:any)=>s.statSourceId===1&&s.scoringPeriodId===week);
      const season=findStat(stats,0,0)||stats.find((s:any)=>s.statSourceId===0&&s.seasonId===2026&&s.statSplitTypeId===0);
      const lastActual=[...stats].filter((s:any)=>s.statSourceId===0&&s.statSplitTypeId===1&&Number(s.scoringPeriodId)<week).sort((a:any,b:any)=>Number(b.scoringPeriodId)-Number(a.scoringPeriodId))[0];
      const seasonPts=num(season?.appliedTotal);
      return {espnId:String(p.id||entry.id||''),weekly:num(weekly?.appliedTotal),season:seasonPts,average:week>1?seasonPts/(week-1):seasonPts,last:num(lastActual?.appliedTotal)};
    }).filter((x:EspnRow)=>x.espnId);
  }catch{return[]}
}

async function games(){try{const week=currentWeek();const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2`,{next:{revalidate:600}});if(!r.ok)return[];const d=await r.json();return (d.events||[]).map((e:any)=>{const c=e.competitions?.[0];const h=c?.competitors?.find((x:any)=>x.homeAway==='home');const a=c?.competitors?.find((x:any)=>x.homeAway==='away');return{home:h?.team?.abbreviation||'',away:a?.team?.abbreviation||'',date:e.date||'',status:e.status?.type?.shortDetail||''}})}catch{return[]}}

export function points(x:FantasyLine|undefined,s:Scoring='ppr'){
  if(!x)return 0;
  const direct=s==='ppr'?x.pts_ppr:s==='half'?x.pts_half_ppr:x.pts_std;
  if(direct!==undefined)return direct;
  // Some projection feeds omit half-PPR while supplying PPR + standard.
  if(s==='half'&&x.pts_ppr!==undefined&&x.pts_std!==undefined)return (x.pts_ppr+x.pts_std)/2;
  return 0;
}

const fantasyDefensePositions=['QB','RB','WR','TE'] as const;
type FantasyDefensePosition=typeof fantasyDefensePositions[number];
function matchupRanks(players:Player[],stats:FantasyLine[],scoring:Scoring){
  const totals=new Map<string,Record<FantasyDefensePosition,number>>();
  for(const p of players){if(!p.team||!fantasyDefensePositions.includes(p.position as FantasyDefensePosition))continue;const line=stats.find(x=>x.player_id===p.id);if(!line)continue;const pos=p.position as FantasyDefensePosition;const row=totals.get(p.team)||{QB:0,RB:0,WR:0,TE:0};row[pos]+=points(line,scoring);totals.set(p.team,row)}
  const out=new Map<string,Record<FantasyDefensePosition,number>>();
  for(const pos of fantasyDefensePositions){const ordered=Array.from(totals.entries()).sort((a,b)=>a[1][pos]-b[1][pos]);ordered.forEach(([team],i)=>{const row=out.get(team)||{QB:0,RB:0,WR:0,TE:0};row[pos]=i+1;out.set(team,row)})}
  return out;
}
function matchupMeta(rank?:number){if(!rank)return{label:'Unavailable',tone:'neutral' as const};if(rank>=23)return{label:'Favorable',tone:'good' as const};if(rank<=10)return{label:'Tough',tone:'bad' as const};return{label:'Neutral',tone:'neutral' as const}}

export async function playerMetrics(scoring:Scoring='ppr'){
  const week=currentWeek();
  const [players,sProj,sStats,espn,schedule]=await Promise.all([getPlayers(),sleeperData('projections',week),sleeperData('stats'),espnFantasy(scoring),games()]);
  const pm=new Map(sProj.map(x=>[x.player_id,x])),sm=new Map(sStats.map(x=>[x.player_id,x])),em=new Map(espn.map(x=>[x.espnId,x]));
  const defenseRanks=matchupRanks(players,sStats,scoring);
  let rows:PlayerMetric[]=players.map(player=>{
    const sp=pm.get(player.id),ss=sm.get(player.id),e=player.espnId?em.get(player.espnId):undefined;
    const sleeperProjection=points(sp,scoring);
    const espnProjection=e?.weekly||0;
    // Prefer a real Sleeper weekly projection because that feed is available without a
    // user's private league credentials. Use ESPN only when ESPN actually returned PROJ.
    const projection=sleeperProjection>0?sleeperProjection:espnProjection;
    const projectionSource=sleeperProjection>0?'Sleeper live weekly projection':espnProjection>0?'ESPN PROJ':'Unavailable';
    const seasonPoints=points(ss,scoring)>0?points(ss,scoring):(e?.season||0);
    const average=seasonPoints>0&&week>1?seasonPoints/(week-1):(e?.average||0);
    const last=e?.last||0;
    const g=schedule.find((x:any)=>x.home===player.team||x.away===player.team); const home=g?.home===player.team; const opponent=g?(home?g.away:g.home):undefined;
    const matchupRank=opponent&&fantasyDefensePositions.includes(player.position as FantasyDefensePosition)?defenseRanks.get(opponent)?.[player.position as FantasyDefensePosition]:undefined; const meta=matchupMeta(matchupRank);
    const value=Math.max(0,Math.round((projection*7+average*4+seasonPoints*.55)*10)/10);
    return{player,projection,seasonPoints,average,last,value,rank:0,positionRank:0,source:projectionSource,projectionSource,opponent,home,gameDate:g?.date,gameStatus:g?.status,matchupRank,matchupLabel:meta.label,matchupTone:meta.tone};
  }).filter(x=>['QB','RB','WR','TE','K'].includes(x.player.position));
  rows.sort((a,b)=>b.projection-a.projection||b.average-a.average);
  rows.forEach((x,i)=>x.rank=i+1);
  for(const pos of ['QB','RB','WR','TE','K'])rows.filter(x=>x.player.position===pos).forEach((x,i)=>x.positionRank=i+1);
  return rows;
}

export async function trending(type:'add'|'drop'='add',limit=25){try{const r=await fetch(`${SLEEPER_PUBLIC}/v1/players/nfl/trending/${type}?lookback_hours=24&limit=${limit}`,{next:{revalidate:900}});return r.ok?await r.json():[]}catch{return[]}}
