export type Player={player_id:string;first_name?:string;last_name?:string;full_name?:string;team?:string;position?:string;fantasy_positions?:string[];number?:number;status?:string;injury_status?:string|null;espn_id?:string|number|null;age?:number;height?:string;weight?:string;college?:string};
export const experts=['Cyrus','Aiden','Gerardo','Nehemiah'];
export function playerName(p:Player){return p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||'Unknown Player'}
export function headshot(p:Player){return p.espn_id?`https://a.espncdn.com/i/headshots/nfl/players/full/${p.espn_id}.png`:''}
