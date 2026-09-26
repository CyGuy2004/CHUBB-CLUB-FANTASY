import {currentWeek,getPlayers} from './players';
import type {Player} from './types';
export type Scoring='ppr'|'half'|'standard';
export type FantasyLine={player_id:string;stats:Record<string,number>;pts_ppr?:number;pts_half_ppr?:number;pts_std?:number};
const S='https://api.sleeper.app';
function normalize(raw:any):FantasyLine[]{const a=Array.isArray(raw)?raw:Object.entries(raw||{}).map(([id,v]:any)=>({...v,player_id:v?.player_id||id}));return a.map((x:any)=>({player_id:String(x.player_id||x.player?.player_id||''),stats:x.stats||x,pts_ppr:num(x.pts_ppr??x.stats?.pts_ppr),pts_half_ppr:num(x.pts_half_ppr??x.stats?.pts_half_ppr),pts_std:num(x.pts_std??x.stats?.pts_std)})).filter(x=>x.player_id)}
const num=(v:any)=>Number.isFinite(Number(v))?Number(v):undefined;
async function feed(kind:'stats'|'projections',week?:number){try{const url=`${S}/${kind}/nfl/regular/2026${week?`/${week}`:''}`;const r=await fetch(url,{next:{revalidate:kind==='projections'?1800:3600}});if(!r.ok)return[];return normalize(await r.json())}catch{return[]}}
export const weeklyProjections=(week=currentWeek())=>feed('projections',week);
export const seasonProjections=()=>feed('projections');
export const seasonStats=()=>feed('stats');
export const weeklyStats=(week=currentWeek())=>feed('stats',week);
export function points(x:FantasyLine|undefined,s:Scoring='ppr'){if(!x)return 0;return Number(s==='ppr'?x.pts_ppr:s==='half'?x.pts_half_ppr:x.pts_std)||0}
export function stat(x:FantasyLine|undefined,...keys:string[]){for(const k of keys){const v=x?.stats?.[k];if(v!==undefined&&v!==null)return Number(v)||0}return 0}
export type PlayerMetric={player:Player;projection:number;seasonPoints:number;value:number;rank:number;positionRank:number;line?:FantasyLine;season?:FantasyLine};
export async function playerMetrics(scoring:Scoring='ppr'){const [players,proj,stats,ros]=await Promise.all([getPlayers(),weeklyProjections(),seasonStats(),seasonProjections()]);const pm=new Map(proj.map(x=>[x.player_id,x])),sm=new Map(stats.map(x=>[x.player_id,x])),rm=new Map(ros.map(x=>[x.player_id,x]));let rows=players.map(player=>{const p=pm.get(player.id),season=sm.get(player.id),r=rm.get(player.id);const projection=points(p,scoring);const seasonPoints=points(season,scoring);const rosPts=points(r,scoring);const base=rosPts||projection*14||seasonPoints*4;return{player,projection,seasonPoints,value:Math.max(1,Math.round(base*10)/10),rank:0,positionRank:0,line:p,season}}).filter(x=>['QB','RB','WR','TE','K'].includes(x.player.position));rows.sort((a,b)=>b.projection-a.projection||b.value-a.value);rows.forEach((x,i)=>x.rank=i+1);for(const pos of ['QB','RB','WR','TE','K'])rows.filter(x=>x.player.position===pos).forEach((x,i)=>x.positionRank=i+1);return rows}
export async function trending(type:'add'|'drop'='add',limit=25){try{const r=await fetch(`${S}/v1/players/nfl/trending/${type}?lookback_hours=24&limit=${limit}`,{next:{revalidate:900}});return r.ok?await r.json():[]}catch{return[]}}
