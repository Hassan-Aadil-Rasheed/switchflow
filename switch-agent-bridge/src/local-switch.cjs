const fs=require('node:fs');
const path=require('node:path');
function localSwitchUrl({appData=process.env.APPDATA,override=process.env.SWITCH_BASE_URL,fallback='http://127.0.0.1:61512'}={}){
  if(override?.trim())return override.trim().replace(/\/$/,'');
  // Switch Console's native server can choose a new port on restart while
  // ports.json retains an older installation-time value.
  try{
    const env=fs.readFileSync(path.join(appData,'switchdash','local-switch-server','native','run','switch-core.env'),'utf8');
    const port=Number(env.match(/^SERVER_PORT=(\d+)\s*$/m)?.[1]);
    if(Number.isInteger(port)&&port>0&&port<=65535)return `http://127.0.0.1:${port}`;
  }catch{}
  try{
    const {api}=JSON.parse(fs.readFileSync(path.join(appData,'switchdash','local-switch-server','ports.json'),'utf8'));
    if(Number.isInteger(api)&&api>0&&api<=65535)return `http://127.0.0.1:${api}`;
  }catch{}
  return fallback;
}
module.exports={localSwitchUrl};
