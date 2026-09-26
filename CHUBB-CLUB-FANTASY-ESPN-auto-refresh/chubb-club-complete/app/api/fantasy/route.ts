import {NextResponse} from 'next/server';import {playerMetrics,trending,type Scoring} from '@/lib/fantasy';
export async function GET(req:Request){
 const u=new URL(req.url),raw=u.searchParams.get('scoring')||'ppr',scoring=(['ppr','half','standard'].includes(raw)?raw:'ppr') as Scoring;
 const[metrics,adds,drops]=await Promise.all([playerMetrics(scoring),trending('add',30),trending('drop',20)]);const espnCount=metrics.filter(x=>x.projectionSource==='ESPN PROJ').length;const updatedAt=metrics.find(x=>x.updatedAt)?.updatedAt||null;
 return NextResponse.json({metrics,adds,drops,status:{projectedPlayers:espnCount,espnProjectedPlayers:espnCount,source:espnCount?'ESPN PROJ':'ESPN projection feed unavailable',updatedAt,leagueId:process.env.ESPN_LEAGUE_ID||'1567061434'}},{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=300'}})
}
