import {Player} from './types';
const SLEEPER='https://api.sleeper.app/v1/players/nfl';
const ACTIVE_POS=new Set(['QB','RB','WR','TE','K']);
export async function getPlayers():Promise<Player[]>{
 const r=await fetch(SLEEPER,{next:{revalidate:21600}}); if(!r.ok) throw new Error('Player feed unavailable');
 const raw=await r.json();
 return Object.values(raw).map((p:any)=>({id:String(p.player_id),espnId:p.espn_id?String(p.espn_id):undefined,name:p.full_name||`${p.first_name||''} ${p.last_name||''}`.trim(),firstName:p.first_name,lastName:p.last_name,team:p.team||'',position:p.position||'',number:p.number??null,status:p.status||'',injuryStatus:p.injury_status||null,age:p.age??null,yearsExp:p.years_exp??null,headshot:p.espn_id?`https://a.espncdn.com/i/headshots/nfl/players/full/${p.espn_id}.png`:`https://sleepercdn.com/content/nfl/players/${p.player_id}.jpg`,sleeperHeadshot:`https://sleepercdn.com/content/nfl/players/${p.player_id}.jpg`})).filter((p:Player)=>p.name&&p.team&&ACTIVE_POS.has(p.position)&&!['Inactive','Retired'].includes(p.status||''));
}
export async function getPlayer(id:string){return (await getPlayers()).find(p=>p.id===id)||null}
export function currentWeek(){const start=new Date('2026-09-09T00:00:00-04:00').getTime(); return Math.max(1,Math.min(18,Math.floor((Date.now()-start)/(7*86400000))+1));}
