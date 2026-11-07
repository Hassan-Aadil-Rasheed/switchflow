const {app,BrowserWindow,ipcMain,Menu,dialog,safeStorage,session} = require('electron');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
let window, backend;
let switchLaunchAttempted = false;
const origin = 'http://127.0.0.1:8787';
const root = () => app.isPackaged ? process.resourcesPath : path.resolve(__dirname,'..');
const stateFile = () => path.join(app.getPath('userData'),'agent-state.json');
const savedSessionFile = () => path.join(app.getPath('userData'),'switch-session.bin');
const sourceState = path.resolve(__dirname,'..','switch-agent-bridge','state.json');
const switchUrl=()=>require(path.join(root(),'switch-agent-bridge','src','local-switch.cjs')).localSwitchUrl();
function savedSession() {
  if(!safeStorage.isEncryptionAvailable()||!fs.existsSync(savedSessionFile()))return null;
  try{return JSON.parse(safeStorage.decryptString(fs.readFileSync(savedSessionFile())));}catch{return null;}
}
function saveSession(value) {
  if(!value){
    if(fs.existsSync(savedSessionFile()))fs.unlinkSync(savedSessionFile());
    session.defaultSession.cookies.remove(origin,'switchflow_session').catch(()=>{});
    return;
  }
  if(!safeStorage.isEncryptionAvailable())return;
  fs.writeFileSync(savedSessionFile(),safeStorage.encryptString(JSON.stringify(value)),{mode:0o600});
  session.defaultSession.cookies.set({url:origin,name:'switchflow_session',value:value.id,httpOnly:true,sameSite:'strict',expirationDate:Math.floor(value.expires/1000)}).catch(()=>{});
}
async function probe(url) { try { const result=await fetch(url,{signal:AbortSignal.timeout(1500)}); return result.ok ? await result.json() : null; } catch {return null;} }
function launchInstalled(candidates) {
  const executable=candidates.find(file=>fs.existsSync(file));
  if (!executable) throw new Error('Application not found. Install it first or open it manually.');
  const child=spawn(executable,[],{detached:true,stdio:'ignore',windowsHide:false});
  child.on('error',error=>dialog.showErrorBox('Startup error',error.message)); child.unref();
}
async function startSwitchServer({retry=false}={}) {
  // Avoid creating a second Console window when its local server is ready.
  if(await probe(switchUrl()+'/health')) return {running:true,started:false};
  if(switchLaunchAttempted&&!retry) return {running:false,started:false};
  switchLaunchAttempted=true;
  launchInstalled([path.join(process.env.LOCALAPPDATA,'Programs','Switch Console','Switch Console.exe')]);
  // Console exposes the server Start action in its window, not its local
  // control API. Invoke that exact enabled button after its window appears.
  const script=app.isPackaged?path.join(process.resourcesPath,'start-switch.ps1'):path.join(__dirname,'start-switch.ps1');
  const starter=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{windowsHide:true,stdio:'ignore'});
  starter.on('error',error=>dialog.showErrorBox('Switch startup error',error.message));
  return {running:false,started:true};
}
async function startBackend() {
  if(await probe(origin+'/api/status')) return;
  if(backend && backend.exitCode === null) return;
  if(!fs.existsSync(stateFile())) {
    if(!app.isPackaged && fs.existsSync(sourceState)) fs.copyFileSync(sourceState,stateFile());
  }
  const log=fs.openSync(path.join(app.getPath('userData'),'backend.log'),'a');
  const previousSession=savedSession();
  backend=spawn(process.execPath,[path.join(root(),'switch-agent-bridge','src','index.js')],{
    cwd:path.join(root(),'switch-agent-bridge'),windowsHide:true,
    env:{...process.env,ELECTRON_RUN_AS_NODE:'1',SWITCHFLOW_STATE_PATH:stateFile()},
    stdio:['ignore',log,log,'ipc'],
  });
  fs.closeSync(log);
  let finishRestore;
  const restored=new Promise(resolve=>{finishRestore=resolve;});
  const timeout=setTimeout(()=>finishRestore(),5000);
  backend.on('message',message=>{
    if(message?.type==='switch-session-ready'){
      if(previousSession)backend.send({type:'switch-session-restore',value:previousSession});
      else finishRestore();
    }
    if(message?.type==='switch-session-restored'){
      if(message.restored){
        session.defaultSession.cookies.set({url:origin,name:'switchflow_session',value:message.id,httpOnly:true,sameSite:'strict',expirationDate:Math.floor(message.expires/1000)})
          .then(()=>finishRestore(),()=>finishRestore());
      }else {saveSession(null);finishRestore();}
    }
    if(message?.type==='switch-session-save')saveSession(message.value);
  });
  backend.once('exit',()=>finishRestore());
  backend.on('error',error=>dialog.showErrorBox('Backend error',error.message));
  await restored;clearTimeout(timeout);
}
function trusted(event) { if(!event.senderFrame.url.startsWith('file://')) throw new Error('Unavailable outside the desktop status screen.'); }
app.requestSingleInstanceLock() || app.quit();
app.on('second-instance',()=>{if(window){window.show();window.focus();}});
app.whenReady().then(async()=>{
  fs.mkdirSync(app.getPath('userData'),{recursive:true});
  window=new BrowserWindow({width:1320,height:900,minWidth:900,minHeight:650,title:'SwitchFlow',webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(origin+'/')&&!url.startsWith('file://'))event.preventDefault();});
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'SwitchFlow',submenu:[{label:'Service status',click:()=>window.loadFile(path.join(__dirname,'status.html'))},{label:'Reload',role:'reload'},{type:'separator'},{role:'quit'}]}]));
  ipcMain.handle('desktop:status',async event=>{trusted(event);await startBackend();return {backend:await probe(origin+'/api/status'),switch:!!await probe(switchUrl()+'/health'),configured:fs.existsSync(stateFile()),statePath:stateFile()};});
  ipcMain.handle('desktop:workflow',async event=>{trusted(event);if(!await probe(origin+'/api/status'))throw new Error('The backend is not ready. Check agent setup.');await window.loadURL(origin);});
  ipcMain.handle('desktop:docker',event=>{trusted(event);launchInstalled([path.join(process.env.ProgramFiles||'C:\\Program Files','Docker','Docker','Docker Desktop.exe'),'D:\\DockerDesktop\\Docker Desktop.exe']);});
  ipcMain.handle('desktop:switch',async event=>{trusted(event);return startSwitchServer({retry:true});});
  ipcMain.handle('desktop:import',async event=>{
    trusted(event);
    const result=await dialog.showOpenDialog(window,{title:'Import your SwitchFlow agent state',properties:['openFile'],filters:[{name:'Agent state',extensions:['json']}]});
    if(result.canceled)return false;
    const content=fs.readFileSync(result.filePaths[0],'utf8');
    const candidate=JSON.parse(content);
    if(!candidate.room?.id || !['architect','analyst','operator','verifier'].every(key=>candidate.agents?.[key]?.id&&candidate.agents[key].apiKey))throw new Error('This is not a valid SwitchFlow agent state file.');
    if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(candidate.baseUrl))throw new Error('This desktop build requires a local Switch server address.');
    fs.writeFileSync(stateFile(),content,{mode:0o600});return true;
  });
  // Switch Console owns the native local server. The bridge reconnects while
  // Console finishes starting it, so the user never has to launch it manually.
  await startSwitchServer();
  await startBackend(); await window.loadFile(path.join(__dirname,'status.html'));
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{if(backend){backend.kill();backend=null;}});
