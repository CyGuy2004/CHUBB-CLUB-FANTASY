import {currentWeek,getPlayers} from './players';
import type {Player} from './types';
export type Scoring='ppr'|'half'|'standard';
export type FantasyLine={player_id:string;stats:Record<string,number>;pts_ppr?:number;pts_half_ppr?:number;pts_std?:number;source?:string};
export type PlayerMetric={player:Player;projection:number;seasonPoints:number;value:number;rank:number;positionRank:number;line?:FantasyLine;season?:FantasyLine;source:string};
const S='https://api.sleeper.app';
const num=(v:any)=>Number.isFinite(Number(v))?Number(v):undefined;
function normalize(raw:any):FantasyLine[]{const a=Array.isArray(raw)?raw:Object.entries(raw||{}).map(([id,v]:any)=>({...v,player_id:v?.player_id||id}));return a.map((x:any)=>({player_id:String(x.player_id||x.player?.player_id||''),stats:x.stats||x,pts_ppr:num(x.pts_ppr??x.stats?.pts_ppr),pts_half_ppr:num(x.pts_half_ppr??x.stats?.pts_half_ppr),pts_std:num(x.pts_std??x.stats?.pts_std),source:'Sleeper'})).filter(x=>x.player_id)}
async function sleeper(kind:'stats'|'projections',week?:number){try{const url=`${S}/${kind}/nfl/regular/2026${week?`/${week}`:''}`;const r=await fetch(url,{next:{revalidate:kind==='projections'?900:1800}});if(!r.ok)return[];return normalize(await r.json())}catch{return[]}}

type EspnRow={espnId:string;weekly:number;season:number;stats:Record<string,number>};
async function espnFantasy(scoring:Scoring):Promise<EspnRow[]>{
  // ESPN's fantasy player pool contains the same PROJ/PTS values shown in its fantasy UI.
  // leaguedefaults/3 is PPR; /1 is standard. Half-PPR is blended from those two below.
  if(scoring==='half'){const [ppr,std]=await Promise.all([espnFantasy('ppr'),espnFantasy('standard')]);const sm=new Map(std.map(x=>[x.espnId,x]));return ppr.map(p=>{const s=sm.get(p.espnId);return{espnId:p.espnId,weekly:(p.weekly+(s?.weekly??p.weekly))/2,season:(p.season+(s?.season??p.season))/2,stats:p.stats}})}
  const leagueDefault=scoring==='ppr'?3:1; const week=currentWeek();
  const url=`https://fantasy.espn.com/apis/v3/games/ffl/seasons/2026/segments/0/leaguedefaults/${leagueDefault}?scoringPeriodId=${week}&view=kona_player_info`;
  const filter={players:{limit:2000,filterStatsForSplitTypeIds:{value:[0,1]},sortPercOwned:{sortPriority:1,sortAsc:false}}};
  try{
    const r=await fetch(url,{headers:{'X-Fantasy-Filter':JSON.stringify(filter),'Accept':'application/json','User-Agent':'Mozilla/5.0 ChubbClubFantasy/1.0'},next:{revalidate:900}});
    if(!r.ok)return[]; const data=await r.json();
    return (data.players||[]).map((entry:any)=>{const p=entry.playerPoolEntry?.player||entry.player||entry.playerPoolEntry||{};const stats=Array.isArray(p.stats)?p.stats:[];
      const weeklyProj=stats.find((s:any)=>s.statSourceId===1&&s.statSplitTypeId===1&&s.scoringPeriodId===week) || stats.find((s:any)=>s.statSourceId===1&&s.scoringPeriodId===week);
      const seasonActual=stats.find((s:any)=>s.statSourceId===0&&s.statSplitTypeId===0&&s.seasonId===2026);
      return {espnId:String(p.id||entry.id||''),weekly:Number(weeklyProj?.appliedTotal||0),season:Number(seasonActual?.appliedTotal||0),stats:seasonActual?.stats||{}};
    }).filter((x:EspnRow)=>x.espnId);
  }catch{return[]}
}
export function points(x:FantasyLine|undefined,s:Scoring='ppr'){if(!x)return 0;return Number(s==='ppr'?x.pts_ppr:s==='half'?x.pts_half_ppr:x.pts_std)||0}
export async function playerMetrics(scoring:Scoring='ppr'){
  const [players,espn,sProj,sStats]=await Promise.all([getPlayers(),espnFantasy(scoring),sleeper('projections',currentWeek()),sleeper('stats')]);
  const em=new Map(espn.map(x=>[x.espnId,x])),pm=new Map(sProj.map(x=>[x.player_id,x])),sm=new Map(sStats.map(x=>[x.player_id,x]));
  let rows:PlayerMetric[]=players.map(player=>{const e=player.espnId?em.get(player.espnId):undefined;const sp=pm.get(player.id),ss=sm.get(player.id);const projection=e?.weekly||points(sp,scoring);const seasonPoints=e?.season||points(ss,scoring);const value=Math.max(0,Math.round((projection*8+seasonPoints)*10)/10);return{player,projection,seasonPoints,value,rank:0,positionRank:0,line:sp,season:ss,source:e?.weekly?'ESPN':'Fantasy feed'}}).filter(x=>['QB','RB','WR','TE','K'].includes(x.player.position));
  rows.sort((a,b)=>b.projection-a.projection||b.seasonPoints-a.seasonPoints);rows.forEach((x,i)=>x.rank=i+1);for(const pos of ['QB','RB','WR','TE','K'])rows.filter(x=>x.player.position===pos).forEach((x,i)=>x.positionRank=i+1);return rows;
}
export async function trending(type:'add'|'drop'='add',limit=25){try{const r=await fetch(`${S}/v1/players/nfl/trending/${type}?lookback_hours=24&limit=${limit}`,{next:{revalidate:900}});return r.ok?await r.json():[]}catch{return[]}}
