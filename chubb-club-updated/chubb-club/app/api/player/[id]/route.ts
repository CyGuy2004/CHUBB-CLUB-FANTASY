import {NextResponse} from 'next/server';
export const revalidate=3600;
export async function GET(_:Request,{params}:{params:{id:string}}){
 const id=params.id;
 try{
  const all=await fetch('https://api.sleeper.app/v1/players/nfl',{next:{revalidate:86400}}).then(r=>r.json());
  const p=all[id]; if(!p)return NextResponse.json({error:'Player not found'},{status:404});
  let stats=null;
  if(p.espn_id){try{const r=await fetch(`https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${p.espn_id}/stats`,{next:{revalidate:3600}});if(r.ok)stats=await r.json()}catch{}}
  return NextResponse.json({player:p,stats});
 }catch{return NextResponse.json({error:'Player data unavailable'},{status:503})}
}
