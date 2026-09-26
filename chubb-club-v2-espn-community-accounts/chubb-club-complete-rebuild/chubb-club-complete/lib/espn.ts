export type EspnNewsItem={title:string;description:string;link:string;published:string};
const RSS='https://www.espn.com/espn/rss/nfl/news';
function decode(s:string){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function tag(block:string,name:string){const m=block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`,'i'));return m?decode(m[1].trim()):''}
export async function getEspnNews(limit=8):Promise<EspnNewsItem[]>{
 try{const r=await fetch(RSS,{next:{revalidate:900},headers:{'User-Agent':'ChubbClubFantasy/1.0'}});if(!r.ok)return[];const xml=await r.text();return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0,limit).map(x=>({title:tag(x[1],'title'),description:tag(x[1],'description').replace(/<[^>]+>/g,'').trim(),link:tag(x[1],'link'),published:tag(x[1],'pubDate')})).filter(x=>x.title&&x.link)}catch{return[]}
}
export type EspnGame={home:string;away:string;date:string;status:string};
export async function getEspnGames():Promise<EspnGame[]>{
 try{const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',{next:{revalidate:300}});if(!r.ok)return[];const j:any=await r.json();return (j.events||[]).map((e:any)=>{const c=e.competitions?.[0]?.competitors||[];const home=c.find((x:any)=>x.homeAway==='home');const away=c.find((x:any)=>x.homeAway==='away');return{home:home?.team?.abbreviation||'',away:away?.team?.abbreviation||'',date:e.date,status:e.status?.type?.shortDetail||''}}).filter((g:EspnGame)=>g.home&&g.away)}catch{return[]}
}
export function matchupFor(team:string,games:EspnGame[]){const aliases:Record<string,string>={JAX:'JAC',WSH:'WAS'};const t=aliases[team]||team;const g=games.find(x=>x.home===t||x.away===t);if(!g)return null;return{opponent:g.home===t?g.away:g.home,home:g.home===t,date:g.date,status:g.status}}
