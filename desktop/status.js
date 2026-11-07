const $=id=>document.getElementById(id);
function setStatus(id,value,good){const element=$(id);element.textContent=value;element.classList.toggle('offline',!good);}
async function refresh(){try{const value=await window.desktop.status();setStatus('backend',value.backend?'Running':'Offline',!!value.backend);setStatus('switch',value.switch?'Running':'Starting…',!!value.switch);const count=value.backend?.connectedAgents?.length||0;setStatus('agents',`${count} connected`,count>0);$('checked').textContent='Updates every 10 seconds';$('notice').textContent=!value.backend?'SwitchFlow is still starting. Refresh in a moment.':!value.switch?'Switch Console is starting its local server. You can open the workspace while it connects.':'';}catch(error){$('notice').textContent=error.message;}}
for(const [id,method] of [['open','openWorkflow'],['docker','startDocker'],['console','startSwitch']])$(id).onclick=async()=>{try{await window.desktop[method]();if(id!=='open')await refresh();}catch(error){$('notice').textContent=error.message;}};
$('refresh').onclick=refresh;
$('import').onclick=async()=>{try{const imported=await window.desktop.importState();await refresh();if(imported)$('notice').textContent='Agent setup imported.';}catch(error){$('notice').textContent=error.message;}};
refresh();setInterval(refresh,10000);
