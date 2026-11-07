// Explicit local acceptance test. Creates a real owner-owned demo team and
// internal Switch room; never approves execution or posts to an external chat.
import fs from 'node:fs';
import path from 'node:path';
const env=Object.fromEntries(fs.readFileSync(path.join(process.env.APPDATA,'switchdash/local-switch-server/native/run/switch-core.env'),'utf8').split(/\r?\n/).filter(line=>line.includes('=')).map(line=>{const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1)];}));
const base='http://127.0.0.1:8787';
const response=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:env.GATEWAY_ADMIN_EMAIL,password:env.GATEWAY_ADMIN_PASSWORD})});
if(!response.ok)throw new Error('Local sign-in failed.');
const cookie=response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
async function post(route,body){const result=await fetch(base+route,{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await result.json();if(!result.ok)throw new Error(data.error);return data;}
const plan=await post('/api/plans',{business:'Café',goal:'Reduce unsold pastries. Create a sample-data-only workflow for human review; do not approve or contact suppliers.',metric:'A reviewable simulated pastry waste plan, with missing data identified.',permission:'Ask before acting',channels:[],data:[],trigger:'Manually'});
console.log(JSON.stringify({stage:'plan',title:plan.title,agents:plan.agents.map(agent=>agent.displayName)}));
const started=await post('/api/workflows',{planId:plan.planId});
console.log(JSON.stringify({stage:'created',teamId:started.team.id,room:started.room,agents:started.team.agents.map(agent=>({id:agent.id,name:agent.name,displayName:agent.displayName}))}));
