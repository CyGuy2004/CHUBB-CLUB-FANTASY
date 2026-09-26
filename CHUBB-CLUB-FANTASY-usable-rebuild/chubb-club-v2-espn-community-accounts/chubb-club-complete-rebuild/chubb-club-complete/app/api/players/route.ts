import {NextResponse} from 'next/server';import {getPlayers} from '@/lib/players';
export async function GET(){try{return NextResponse.json(await getPlayers())}catch(e){return NextResponse.json({error:'Unable to load players'},{status:503})}}
