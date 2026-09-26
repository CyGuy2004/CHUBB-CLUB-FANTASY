import {NextResponse} from 'next/server';import {getEspnNews} from '@/lib/espn';
export async function GET(){return NextResponse.json(await getEspnNews(12))}
