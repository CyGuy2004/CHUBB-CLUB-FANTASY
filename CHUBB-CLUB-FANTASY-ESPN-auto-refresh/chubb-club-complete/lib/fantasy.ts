import {currentWeek,getPlayers} from './players';
import type {Player} from './types';

export type Scoring='ppr'|'half'|'standard';
export type FantasyLine={player_id:string;stats:Record<string,number>;pts_ppr?:number;pts_half_ppr?:number;pts_std?:number;source?:string;hasProjection?:boolean};
export type PlayerMetric={player:Player;projection:number;seasonPoints:number;average:number;last:number;value:number;rank:number;positionRank:number;source:string;projectionSource:string;opponent?:string;home?:boolean;gameDate?:string;gameStatus?:string;matchupRank?:number;matchupLabel?:string;matchupTone?:'good'|'neutral'|'bad';updatedAt?:string};

const SEASON=2026;
const ESPN_LEAGUE_ID=process.env.ESPN_LEAGUE_ID||'1567061434';
const SLEEPER='https://api.sleeper.app';
const optionalNum=(v:any)=>v===undefined||v===null||v===''?undefined:(Number.isFinite(Number(v))?Number(v):undefined);
const num=(v:any)=>optionalNum(v)??0;

function normalizeSleeper(raw:any):FantasyLine[]{
 const a=Array.isArray(raw)?raw:Object.entries(raw||{}).map(([id,v]:any)=>({...v,player_id:v?.player_id||id}));
 return a.map((x:any)=>{const s=x.stats||x;return{player_id:String(x.player_id||x.player?.player_id||''),stats:s,pts_ppr:optionalNum(x.pts_ppr??s.pts_ppr),pts_half_ppr:optionalNum(x.pts_half_ppr??s.pts_half_ppr),pts_std:optionalNum(x.pts_std??s.pts_std),source:'Sleeper'}}).filter(x=>x.player_id);
}
async function sleeperStats(week?:number){
 const urls=[`${SLEEPER}/stats/nfl/regular/${SEASON}${week?`/${week}`:''}`,`${SLEEPER}/v1/stats/nfl/regular/${SEASON}${week?`/${week}`:''}`];
 for(const url of urls){try{const r=await fetch(url,{next:{revalidate:600}});if(r.ok){const rows=normalizeSleeper(await r.json());if(rows.length)return rows}}catch{}}
 return [];
}
export function points(x:FantasyLine|undefined,s:Scoring='ppr'){if(!x)return 0;const direct=s==='ppr'?x.pts_ppr:s==='half'?x.pts_half_ppr:x.pts_std;if(direct!==undefined)return direct;if(s==='half'&&x.pts_ppr!==undefined&&x.pts_std!==undefined)return(x.pts_ppr+x.pts_std)/2;return 0}

type EspnRow={espnId:string;weekly:number;season:number;average:number;last:number;updatedAt:string};
function entryPlayer(entry:any){return entry?.playerPoolEntry?.player||entry?.player||entry?.playerPoolEntry||entry||{}}
function allStats(entry:any){const p=entryPlayer(entry);return Array.isArray(p.stats)?p.stats:Array.isArray(entry?.playerPoolEntry?.stats)?entry.playerPoolEntry.stats:Array.isArray(entry?.stats)?entry.stats:[]}
function isProjection(s:any){return Number(s?.statSourceId)===1||[1,2,3].includes(Number(s?.statTypeId))}
function isActual(s:any){return Number(s?.statSourceId)===0||Number(s?.statTypeId)===0}
function applied(s:any){return optionalNum(s?.appliedTotal??s?.appliedStatTotal??s?.points)}
function weeklyProjection(stats:any[],week:number){
 const exact=stats.filter(isProjection).find((s:any)=>Number(s.scoringPeriodId)===week&&applied(s)!==undefined);
 if(exact)return applied(exact)??0;
 const weekly=stats.filter(isProjection).find((s:any)=>[2,3].includes(Number(s.statTypeId))&&applied(s)!==undefined);
 return applied(weekly)??0;
}
function seasonActual(stats:any[]){const row=stats.find((s:any)=>isActual(s)&&Number(s.seasonId||SEASON)===SEASON&&[0,undefined].includes(s.statSplitTypeId)&&applied(s)!==undefined)||stats.find((s:any)=>isActual(s)&&Number(s.seasonId||SEASON)===SEASON&&applied(s)!==undefined);return applied(row)??0}
function lastActual(stats:any[],week:number){const rows=stats.filter((s:any)=>isActual(s)&&Number(s.scoringPeriodId)>0&&Number(s.scoringPeriodId)<week&&applied(s)!==undefined).sort((a:any,b:any)=>Number(b.scoringPeriodId)-Number(a.scoringPeriodId));return applied(rows[0])??0}

async function fetchEspnPlayerPool(url:string,filter:any){
 try{const r=await fetch(url,{headers:{'X-Fantasy-Filter':JSON.stringify(filter),'Accept':'application/json','User-Agent':'Mozilla/5.0 (compatible; ChubbClubFantasy/1.0)'},next:{revalidate:300}});if(!r.ok)return[];const d=await r.json();return Array.isArray(d)?d:(d.players||[])}catch{return[]}
}
async function espnFantasy(scoring:Scoring):Promise<EspnRow[]>{
 const week=currentWeek();
 // ESPN's default league profiles: 3=PPR, 1=standard. Half-PPR is derived only when both feeds are available.
 if(scoring==='half'){
  const [ppr,std]=await Promise.all([espnFantasy('ppr'),espnFantasy('standard')]);const sm=new Map(std.map(x=>[x.espnId,x]));
  return ppr.map(p=>{const s=sm.get(p.espnId);return{...p,weekly:s?(p.weekly+s.weekly)/2:p.weekly,season:s?(p.season+s.season)/2:p.season,average:s?(p.average+s.average)/2:p.average,last:s?(p.last+s.last)/2:p.last}})
 }
 const rankType=scoring==='ppr'?'PPR':'STANDARD';
 const filter={players:{limit:3000,filterActive:{value:true},filterStatsForSplitTypeIds:{value:[0,1,2,3]},filterStatsForSourceIds:{value:[0,1]},filterStatsForExternalIds:{value:[SEASON]},sortPercOwned:{sortPriority:1,sortAsc:false},filterRanksForScoringPeriodIds:{value:[week]},filterRanksForRankTypes:{value:[rankType]}}};
 const base=`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}`;
 const legacy=`https://fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}`;
 const defaultId=scoring==='ppr'?3:1;
 const urls=[
  `${base}/segments/0/leagues/${ESPN_LEAGUE_ID}?view=kona_player_info&scoringPeriodId=${week}`,
  `${base}/players?view=kona_player_info&scoringPeriodId=${week}`,
  `${legacy}/players?view=kona_player_info&scoringPeriodId=${week}`,
  `${legacy}/segments/0/leaguedefaults/${defaultId}?view=kona_player_info&scoringPeriodId=${week}`
 ];
 let entries:any[]=[];
 for(const url of urls){entries=await fetchEspnPlayerPool(url,filter);if(entries.length)break}
 const updatedAt=new Date().toISOString();
 return entries.map((entry:any)=>{const p=entryPlayer(entry),stats=allStats(entry);const season=seasonActual(stats);return{espnId:String(p.id||entry.id||''),weekly:weeklyProjection(stats,week),season,average:week>1?season/(week-1):season,last:lastActual(stats,week),updatedAt}}).filter((x:EspnRow)=>x.espnId);
}

async function games(){try{const week=currentWeek();const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2`,{next:{revalidate:300}});if(!r.ok)return[];const d=await r.json();return(d.events||[]).map((e:any)=>{const c=e.competitions?.[0],h=c?.competitors?.find((x:any)=>x.homeAway==='home'),a=c?.competitors?.find((x:any)=>x.homeAway==='away');return{home:h?.team?.abbreviation||'',away:a?.team?.abbreviation||'',date:e.date||'',status:e.status?.type?.shortDetail||''}})}catch{return[]}}
const defensePositions=['QB','RB','WR','TE'] as const;type DefensePos=typeof defensePositions[number];
function matchupRanks(players:Player[],stats:FantasyLine[],scoring:Scoring){const totals=new Map<string,Record<DefensePos,number>>();for(const p of players){if(!p.team||!defensePositions.includes(p.position as DefensePos))continue;const line=stats.find(x=>x.player_id===p.id);if(!line)continue;const pos=p.position as DefensePos,row=totals.get(p.team)||{QB:0,RB:0,WR:0,TE:0};row[pos]+=points(line,scoring);totals.set(p.team,row)}const out=new Map<string,Record<DefensePos,number>>();for(const pos of defensePositions){Array.from(totals.entries()).sort((a,b)=>a[1][pos]-b[1][pos]).forEach(([team],i)=>{const row=out.get(team)||{QB:0,RB:0,WR:0,TE:0};row[pos]=i+1;out.set(team,row)})}return out}
function matchupMeta(rank?:number){if(!rank)return{label:'Unavailable',tone:'neutral' as const};if(rank>=23)return{label:'Favorable',tone:'good' as const};if(rank<=10)return{label:'Tough',tone:'bad' as const};return{label:'Neutral',tone:'neutral' as const}}

export async function playerMetrics(scoring:Scoring='ppr'){
 const week=currentWeek();const[players,weekStats,seasonStats,espn,schedule]=await Promise.all([getPlayers(),sleeperStats(week),sleeperStats(),espnFantasy(scoring),games()]);
 const wm=new Map(weekStats.map(x=>[x.player_id,x])),sm=new Map(seasonStats.map(x=>[x.player_id,x])),em=new Map(espn.map(x=>[x.espnId,x]));const ranks=matchupRanks(players,weekStats.length?weekStats:seasonStats,scoring);
 let rows:PlayerMetric[]=players.map(player=>{const e=player.espnId?em.get(player.espnId):undefined,ss=sm.get(player.id),ws=wm.get(player.id);const projection=e?.weekly??0;const seasonPoints=e?.season&&e.season>0?e.season:points(ss,scoring);const average=e?.average&&e.average>0?e.average:(week>1?seasonPoints/(week-1):seasonPoints);const last=e?.last&&e.last>0?e.last:points(ws,scoring);const g=schedule.find((x:any)=>x.home===player.team||x.away===player.team),home=g?.home===player.team,opponent=g?(home?g.away:g.home):undefined;const matchupRank=opponent&&defensePositions.includes(player.position as DefensePos)?ranks.get(opponent)?.[player.position as DefensePos]:undefined,meta=matchupMeta(matchupRank);const value=Math.max(0,Math.round((projection*7+average*4+seasonPoints*.55)*10)/10);return{player,projection,seasonPoints,average,last,value,rank:0,positionRank:0,source:projection>0?'ESPN PROJ':'Unavailable',projectionSource:projection>0?'ESPN PROJ':'Unavailable',opponent,home,gameDate:g?.date,gameStatus:g?.status,matchupRank,matchupLabel:meta.label,matchupTone:meta.tone,updatedAt:e?.updatedAt}}).filter(x=>['QB','RB','WR','TE','K'].includes(x.player.position));
 rows.sort((a,b)=>b.projection-a.projection||b.average-a.average);rows.forEach((x,i)=>x.rank=i+1);for(const pos of['QB','RB','WR','TE','K'])rows.filter(x=>x.player.position===pos).forEach((x,i)=>x.positionRank=i+1);return rows;
}
export async function trending(type:'add'|'drop'='add',limit=25){try{const r=await fetch(`${SLEEPER}/v1/players/nfl/trending/${type}?lookback_hours=24&limit=${limit}`,{next:{revalidate:900}});return r.ok?await r.json():[]}catch{return[]}}
