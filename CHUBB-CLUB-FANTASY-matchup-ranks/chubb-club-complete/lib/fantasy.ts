import {currentWeek,getPlayers} from './players';
import type {Player} from './types';
export type Scoring='ppr'|'half'|'standard';
export type FantasyLine={player_id:string;stats:Record<string,number>;pts_ppr?:number;pts_half_ppr?:number;pts_std?:number;source?:string};
export type PlayerMetric={player:Player;projection:number;seasonPoints:number;average:number;last:number;value:number;rank:number;positionRank:number;source:string;projectionSource:string;opponent?:string;home?:boolean;gameDate?:string;gameStatus?:string;matchupRank?:number;matchupLabel?:string;matchupTone?:'good'|'neutral'|'bad'};
const S='https://api.sleeper.app';
const num=(v:any)=>Number.isFinite(Number(v))?Number(v):0;
function normalize(raw:any):FantasyLine[]{const a=Array.isArray(raw)?raw:Object.entries(raw||{}).map(([id,v]:any)=>({...v,player_id:v?.player_id||id}));return a.map((x:any)=>({player_id:String(x.player_id||x.player?.player_id||''),stats:x.stats||x,pts_ppr:num(x.pts_ppr??x.stats?.pts_ppr),pts_half_ppr:num(x.pts_half_ppr??x.stats?.pts_half_ppr),pts_std:num(x.pts_std??x.stats?.pts_std),source:'Sleeper'})).filter(x=>x.player_id)}
async function sleeper(kind:'stats'|'projections',week?:number){try{const url=`${S}/${kind}/nfl/regular/2026${week?`/${week}`:''}`;const r=await fetch(url,{next:{revalidate:kind==='projections'?600:1800}});if(!r.ok)return[];return normalize(await r.json())}catch{return[]}}

type EspnRow={espnId:string;weekly:number;season:number;average:number;last:number};
function findStat(stats:any[],source:number,split:number,week?:number){return stats.find((s:any)=>s.statSourceId===source&&s.statSplitTypeId===split&&(week==null||s.scoringPeriodId===week))}
async function espnFantasy(scoring:Scoring):Promise<EspnRow[]>{
  // ESPN live Fantasy player-pool values. PROJ = ESPN's upcoming-game projection.
  // Default league 3 is PPR and 1 is standard. Half-PPR is the midpoint of ESPN PPR/standard.
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
export function points(x:FantasyLine|undefined,s:Scoring='ppr'){if(!x)return 0;return Number(s==='ppr'?x.pts_ppr:s==='half'?x.pts_half_ppr:x.pts_std)||0}

const fantasyDefensePositions=['QB','RB','WR','TE'] as const;
type FantasyDefensePosition=typeof fantasyDefensePositions[number];
function matchupRanks(players:Player[],stats:FantasyLine[],scoring:Scoring){
  // Position-specific matchup difficulty from fantasy points ALLOWED by each defense so far.
  // Rank #1 = toughest/fewest points allowed; rank #32 = easiest/most points allowed.
  const totals=new Map<string,Record<FantasyDefensePosition,number>>();
  for(const p of players){if(!p.team||!fantasyDefensePositions.includes(p.position as FantasyDefensePosition))continue;const line=stats.find(x=>x.player_id===p.id);if(!line)continue;const pos=p.position as FantasyDefensePosition;const row=totals.get(p.team)||{QB:0,RB:0,WR:0,TE:0};row[pos]+=points(line,scoring);totals.set(p.team,row)}
  const out=new Map<string,Record<FantasyDefensePosition,number>>();
  for(const pos of fantasyDefensePositions){const ordered=Array.from(totals.entries()).sort((a,b)=>a[1][pos]-b[1][pos]);ordered.forEach(([team],i)=>{const row=out.get(team)||{QB:0,RB:0,WR:0,TE:0};row[pos]=i+1;out.set(team,row)})}
  return out;
}
function matchupMeta(rank?:number){if(!rank)return{label:'Unavailable',tone:'neutral' as const};if(rank>=23)return{label:'Favorable',tone:'good' as const};if(rank<=10)return{label:'Tough',tone:'bad' as const};return{label:'Neutral',tone:'neutral' as const}}

export async function playerMetrics(scoring:Scoring='ppr'){
  const week=currentWeek();
  const [players,espn,sProj,sStats,schedule]=await Promise.all([getPlayers(),espnFantasy(scoring),sleeper('projections',week),sleeper('stats'),games()]);
  const em=new Map(espn.map(x=>[x.espnId,x])),pm=new Map(sProj.map(x=>[x.player_id,x])),sm=new Map(sStats.map(x=>[x.player_id,x]));
  const defenseRanks=matchupRanks(players,sStats,scoring);
  let rows:PlayerMetric[]=players.map(player=>{
    const e=player.espnId?em.get(player.espnId):undefined, sp=pm.get(player.id), ss=sm.get(player.id);
    const espnProjection=e?.weekly||0, fallbackProjection=points(sp,scoring), projection=espnProjection||fallbackProjection;
    const seasonPoints=e?.season||points(ss,scoring), average=e?.average||(week>1?seasonPoints/(week-1):seasonPoints), last=e?.last||0;
    const g=schedule.find((x:any)=>x.home===player.team||x.away===player.team); const home=g?.home===player.team; const opponent=g?(home?g.away:g.home):undefined;
    const matchupRank=opponent&&fantasyDefensePositions.includes(player.position as FantasyDefensePosition)?defenseRanks.get(opponent)?.[player.position as FantasyDefensePosition]:undefined; const meta=matchupMeta(matchupRank);
    // Trade value emphasizes season production + ESPN weekly outlook. Matchup is exposed separately rather than inventing a fake adjustment to ESPN's projection.
    const value=Math.max(0,Math.round((projection*7+average*4+seasonPoints*.55)*10)/10);
    return{player,projection,seasonPoints,average,last,value,rank:0,positionRank:0,source:espnProjection>0?'ESPN Fantasy':'Fallback fantasy feed',projectionSource:espnProjection>0?'ESPN PROJ':'Fallback projection',opponent,home,gameDate:g?.date,gameStatus:g?.status,matchupRank,matchupLabel:meta.label,matchupTone:meta.tone};
  }).filter(x=>['QB','RB','WR','TE','K'].includes(x.player.position));
  rows.sort((a,b)=>b.projection-a.projection||b.average-a.average); rows.forEach((x,i)=>x.rank=i+1); for(const pos of ['QB','RB','WR','TE','K'])rows.filter(x=>x.player.position===pos).forEach((x,i)=>x.positionRank=i+1); return rows;
}
export async function trending(type:'add'|'drop'='add',limit=25){try{const r=await fetch(`${S}/v1/players/nfl/trending/${type}?lookback_hours=24&limit=${limit}`,{next:{revalidate:900}});return r.ok?await r.json():[]}catch{return[]}}
