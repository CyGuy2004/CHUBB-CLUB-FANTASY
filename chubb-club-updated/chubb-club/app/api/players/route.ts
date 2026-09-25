import {NextResponse} from 'next/server';
export const revalidate=86400;
export async function GET(){
 try{
  const r=await fetch('https://api.sleeper.app/v1/players/nfl?active=true',{next:{revalidate:86400}});
  if(!r.ok) throw new Error('Player feed unavailable');
  const raw=await r.json();
  const players=Object.values(raw).filter((p:any)=>p.active!==false&&['QB','RB','WR','TE','K'].includes(p.position)).map((p:any)=>({player_id:p.player_id,first_name:p.first_name,last_name:p.last_name,full_name:p.full_name,team:p.team,position:p.position,fantasy_positions:p.fantasy_positions,number:p.number,status:p.status,injury_status:p.injury_status,espn_id:p.espn_id,age:p.age,height:p.height,weight:p.weight,college:p.college}));
  return NextResponse.json({players,updatedAt:new Date().toISOString()});
 }catch(e){return NextResponse.json({players:[],error:'Live player feed is temporarily unavailable.'},{status:503})}
}
