import {createBrowserClient} from '@supabase/ssr';
export function browserSupabase(){const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!u||!k)return null;return createBrowserClient(u,k)}
export const hasSupabase=()=>Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
