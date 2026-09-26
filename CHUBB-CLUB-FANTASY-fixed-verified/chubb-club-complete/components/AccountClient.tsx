'use client';
import {useEffect,useMemo,useState} from 'react';
import {browserSupabase} from '@/lib/supabase';
import {useRouter} from 'next/navigation';

type Profile={id:string;username:string|null;display_name:string|null;bio:string|null;role:string};
export default function AccountClient(){
 const s=useMemo(()=>browserSupabase(),[]); const router=useRouter();
 const [loading,setLoading]=useState(true),[user,setUser]=useState<any>(null),[profile,setProfile]=useState<Profile|null>(null);
 const [username,setUsername]=useState(''),[display,setDisplay]=useState(''),[bio,setBio]=useState(''),[msg,setMsg]=useState('');
 async function load(){
  if(!s){setMsg('Supabase environment variables are missing on Render.');setLoading(false);return}
  const {data:{user:u},error}=await s.auth.getUser();
  if(error||!u){setUser(null);setMsg(error?.message||'You are not signed in.');setLoading(false);return}
  setUser(u);
  let q=await s.from('profiles').select('id,username,display_name,bio,role').eq('id',u.id).maybeSingle();
  if(!q.data){
   const base=(u.user_metadata?.username||u.email?.split('@')[0]||'member').replace(/[^a-zA-Z0-9_]/g,'').slice(0,17)||'member';
   const created=await s.from('profiles').upsert({id:u.id,username:`${base}_${u.id.slice(0,6)}`,display_name:u.user_metadata?.display_name||base},{onConflict:'id'}).select('id,username,display_name,bio,role').single();
   if(created.error){setMsg(`Login works, but the profile could not be created: ${created.error.message}. Run 004_core_repair.sql in Supabase.`);setLoading(false);return}
   q={data:created.data,error:null,count:null,status:200,statusText:'OK'} as any;
  }
  const p=q.data as Profile; setProfile(p);setUsername(p.username||'');setDisplay(p.display_name||'');setBio(p.bio||'');setMsg('');setLoading(false);
 }
 useEffect(()=>{load()},[s]);
 async function save(){if(!s||!user)return;setMsg('Saving…');const clean=username.trim().replace(/[^a-zA-Z0-9_]/g,'').slice(0,24);if(clean.length<3){setMsg('Username must be at least 3 characters.');return}const {data,error}=await s.from('profiles').update({username:clean,display_name:display.trim(),bio:bio.trim()}).eq('id',user.id).select('id,username,display_name,bio,role').single();if(error){setMsg(error.message);return}setProfile(data);setUsername(data.username||'');setMsg('Profile saved.')}
 async function logout(){await s?.auth.signOut();router.push('/');router.refresh()}
 if(loading)return <div className="card"><h3>Account</h3><p>Loading your signed-in account…</p></div>;
 if(!user)return <div className="card"><h3>You are signed out</h3><p className="muted">{msg}</p><a className="btn" href="/login">Log in</a></div>;
 const premium=['subscriber','expert','admin'].includes(profile?.role||'free');
 return <div className="accountGrid"><div className="card"><div className="eyebrow">Signed in as</div><h2>@{profile?.username}</h2><p className="muted">{user.email}</p><label>Username</label><input className="input" value={username} onChange={e=>setUsername(e.target.value)}/><label>Display name</label><input className="input" value={display} onChange={e=>setDisplay(e.target.value)}/><label>Bio</label><textarea className="input" value={bio} onChange={e=>setBio(e.target.value)}/><div className="toolbar"><button className="btn" onClick={save}>Save profile</button><button className="btn dark" onClick={logout}>Log out</button></div>{msg&&<p className="muted">{msg}</p>}</div><div className="card"><div className="eyebrow">Membership</div><h3>{premium?'Chubb Club+':'Free account'}</h3><p className="muted">Account role: {profile?.role||'free'}</p><p>{premium?'Advanced account features are enabled for this profile.':'Your account and username are active. Premium league linking can be added after provider authorization is configured.'}</p></div></div>
}
