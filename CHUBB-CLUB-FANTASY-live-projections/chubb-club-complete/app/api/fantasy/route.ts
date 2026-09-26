import {NextResponse} from 'next/server';import {playerMetrics,trending,type Scoring} from '@/lib/fantasy';
export async function GET(req:Request){
  const u=new URL(req.url);const raw=u.searchParams.get('scoring')||'ppr';const scoring=(['ppr','half','standard'].includes(raw)?raw:'ppr') as Scoring;
  const [metrics,adds,drops]=await Promise.all([playerMetrics(scoring),trending('add',30),trending('drop',20)]);
  const projected=metrics.filter(x=>x.projection>0).length;
  const sleeperCount=metrics.filter(x=>x.projectionSource.startsWith('Sleeper')).length;
  const espnCount=metrics.filter(x=>x.projectionSource==='ESPN PROJ').length;
  return NextResponse.json({metrics,adds,drops,status:{projectedPlayers:projected,sleeperProjectedPlayers:sleeperCount,espnProjectedPlayers:espnCount,source:sleeperCount?'Sleeper live weekly projections':espnCount?'ESPN PROJ':'Projection feed unavailable'}},{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=600'}})
}
