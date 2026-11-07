let connectionTypes = [];
function renderChatPlatforms(connections=[],signedIn=false){
  const summary=SwitchFlowPlatforms.summarize(connections);
  $('#chatConnectionCount').textContent=signedIn?`${summary.apps} of 5 apps connected · ${summary.accounts} connected ${summary.accounts===1?'account':'accounts'}`:'Sign in to see your connected apps.';
  const grid=$('#chatPlatformGrid');grid.replaceChildren();
  for(const platform of summary.cards){
    const card=document.createElement('article');card.className='chat-platform-card';
    const ready=platform.accounts.filter(SwitchFlowPlatforms.connected);
    card.dataset.connected=String(ready.length>0);
    const heading=document.createElement('h4');heading.textContent=platform.name;
    const animatedMark=['discord','telegram','slack','teams','mattermost'].includes(platform.key);
    const mark=document.createElement(animatedMark?'img':'span');
    mark.className=animatedMark?'chat-platform-mark chat-platform-mark--animated':'chat-platform-mark';
    if(animatedMark){mark.src=`./assets/${platform.key}.gif`;mark.alt='';mark.width=56;mark.height=56;}
    else {mark.textContent=platform.mark;mark.setAttribute('aria-hidden','true');}
    const status=document.createElement('p');status.className='chat-platform-status';status.textContent=!signedIn?'Sign in required':ready.length?`${ready.length} connected ${ready.length===1?'account':'accounts'}`:platform.accounts.length?'Needs attention':'Not connected';
    card.append(mark,heading,status);
    if(platform.accounts.length){const names=document.createElement('p');names.className='control-note';names.textContent=platform.accounts.map(account=>`${account.display_name||account.name||platform.name} · ${account.status||'status unknown'}`).join('\n');card.append(names);}
    if(ready.length){
      const select=document.createElement('select');select.setAttribute('aria-label',`${platform.name} account`);
      for(const account of ready){const option=document.createElement('option');option.value=account.bridge_id||account.id;option.textContent=account.display_name||account.name||platform.name;select.append(option);}card.append(select);
      const use=document.createElement('button');use.type='button';use.className='button primary';use.textContent=`Use ${platform.name}`;
      use.addEventListener('click',()=>{$('#workflowConnection').value=select.value;updateChatDestination();rememberChatDestination().catch(error=>showToast(error.message));setView('builder');showToast(`${platform.name} selected for this workflow.`);});card.append(use);
    }
    const connect=document.createElement('button');connect.type='button';connect.className='button ghost';connect.textContent=ready.length?'Connect another account':`Connect ${platform.name}`;
    const available=connectionTypes.some(type=>type.key===platform.key);connect.disabled=!signedIn||!available;
    if(signedIn&&!available)connect.title='This Switch server does not offer this connection type.';
    connect.addEventListener('click',()=>{const details=$('#addChatAppDetails');details.hidden=false;details.open=true;$('#connectionPlatform').value=platform.key;showConnectionFields();details.scrollIntoView({behavior:'smooth',block:'start'});$('#connectionName').focus();});card.append(connect);grid.append(card);
  }
}
async function controlRequest(url, method = 'GET', body) {
  const response = await fetch(url, {method, headers:{'Content-Type':'application/json'}, body:body === undefined ? undefined : JSON.stringify(body)});
  let result;
  try { result = await response.json(); } catch { throw new Error('SwitchFlow could not reach its local engine. Check the Service status screen.'); }
  if (!response.ok) {const error=new Error(result.error || 'Switch request failed.');error.status=response.status;throw error;}
  return result;
}
function showConnectionFields() {
  const platform = connectionTypes.find(item => item.key === $('#connectionPlatform').value);
  const schema = platform?.config_schema || {};
  $('#connectionFields').replaceChildren();
  for (const [key, field] of Object.entries(schema.properties || {})) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    label.textContent = field.title || key.replaceAll('_', ' ');
    input.id = `chat-config-${key}`; label.htmlFor = input.id;
    input.dataset.configKey = key; input.dataset.configType = field.type || 'string';
    input.type = /token|secret|password/i.test(key) ? 'password' : field.type === 'boolean' ? 'checkbox' : field.type === 'integer' ? 'number' : 'text';
    input.required = (schema.required || []).includes(key) && input.type !== 'checkbox';
    input.autocomplete = 'off';
    if (field.type === 'boolean') input.checked = field.default === true;
    else if (field.default !== undefined && field.default !== null) input.value = String(field.default);
    $('#connectionFields').append(label,input);
    if (field.description) { const note = document.createElement('p'); note.className='control-note'; note.textContent=field.description; $('#connectionFields').append(note); }
  }
  $('#connectionCreateChannels').checked = platform?.channel_creation_supported !== false;
  $('#connectionCreateChannels').disabled = platform?.channel_creation_supported === false;
}
async function refreshConnections() {
  const result = await controlRequest('/api/connections');
  if(typeof refreshWorkflowConnections==='function')refreshWorkflowConnections(result);
  if (typeof refreshOverviewReadiness === 'function') refreshOverviewReadiness();
  connectionTypes = result.types;
  const list = Array.isArray(result.connections) ? result.connections : result.connections.bridges || [];
  renderChatPlatforms(list,true);
  $('#addChatAppDetails').hidden=false;
  $('#addChatAppDetails').open=list.length===0;
  $('#connectionCards').innerHTML = list.map(item => `<p><strong>${escapeHtml(item.display_name || item.bridge_type || item.type || 'Chat app')}</strong> · ${escapeHtml(item.bridge_type || item.type || 'Unknown platform')} · ${escapeHtml(item.status || 'registered')} in Switch</p>`).join('') || '<p>No chat apps connected yet.</p>';
  const teams=await controlRequest('/api/teams');
  const teamSection=document.createElement('section');
  teamSection.innerHTML='<h3>Your created agent teams</h3>'+ (teams.length?teams.map(team=>`<article class="workflow-integrations"><h3>${escapeHtml(team.title)}</h3><p>${team.agents.filter(agent=>agent.id).length} registered agents · ${escapeHtml(team.room?.name||'Setup in progress')}</p><ul>${team.agents.map(agent=>`<li><strong>${escapeHtml(agent.displayName)}</strong><br><small>@${escapeHtml(agent.name)}</small></li>`).join('')}</ul></article>`).join(''):'<p>Describe your business in Flow builder to create your first team.</p>');
  $('#connectionCards').append(teamSection);
  for(const team of teams){
    if(!team.room){
      const resume=document.createElement('button');resume.type='button';resume.className='button secondary';resume.textContent=`Finish setup: ${team.title}`;
      resume.addEventListener('click',async()=>{resume.disabled=true;try{await controlRequest('/api/workflows','POST',{teamId:team.id});await refreshConnections();showToast('Team setup completed. Open requests & results.');}catch(error){showToast(error.message);resume.disabled=false;}});
      const remove=document.createElement('button');remove.type='button';remove.className='button ghost';remove.textContent=`Remove workflow: ${team.title}`;
      remove.addEventListener('click',()=>removeCreatedWorkflow(team));
      $('#connectionCards').append(resume,remove);continue;
    }
    const card=document.createElement('article');card.className='workflow-integrations';
    const heading=document.createElement('h3');heading.textContent=team.title;card.append(heading);
    const intake=team.agents.find(agent=>agent.kind==='architect');
    const help=document.createElement('p');help.textContent=team.orderMode?`Customer message in ${team.room.name}: @${intake?.name||'intake-agent'} I want 100 cookies for tomorrow. Use the exact item name in your selected capacity CSV.`:`Your workflow room is ${team.room.name}. Open its activity to review requests, approvals, and results.`;card.append(help);
    const button=document.createElement('button');button.type='button';button.className='button secondary';button.textContent='Open requests & results';
    button.addEventListener('click',()=>openTeamActivity(team).catch(error=>showToast(error.message)));card.append(button);
    const remove=document.createElement('button');remove.type='button';remove.className='button ghost';remove.textContent='Remove workflow';
    remove.addEventListener('click',()=>removeCreatedWorkflow(team));card.append(remove);
    $('#connectionCards').append(card);
  }
  $('#connectionPlatform').innerHTML = connectionTypes.map(item => `<option value="${escapeHtml(item.key)}">${escapeHtml(item.display_name)}</option>`).join('');
  showConnectionFields();
}
async function showSignedIn(user){
  $('#switchLoginForm').hidden=true;
  $('#switchLogout').hidden=false;
  $('#connectionFeedback').textContent='Checking your Switch connection…';
  refreshSwitchAgents();
  refreshAiConnections();
  try{await refreshConnections();}
  catch(error){
    if(error.status===401){$('#switchLoginForm').hidden=false;$('#switchLogout').hidden=true;renderChatPlatforms();$('#connectionFeedback').textContent='Your Switch session expired or the server was replaced. Sign in to the current Switch server.';}
    else $('#connectionFeedback').textContent=`Your session is saved, but Switch is unavailable: ${error.message}. Start Switch Console, then click Refresh status.`;
    throw error;
  }
  $('#connectionFeedback').textContent=`Connected as ${user.name||user.email}. Your Switch session is remembered on this laptop.`;
  if(typeof refreshBusinessData==='function')await refreshBusinessData();
}
controlRequest('/api/session').then(showSignedIn).catch(()=>{});
$('#connectionPlatform').addEventListener('change',showConnectionFields);
$('#switchLoginForm').addEventListener('submit',async event => {
  event.preventDefault();
  $('#connectionFeedback').textContent='Signing in…';
  try {
    const user = await controlRequest('/api/login','POST',{email:$('#switchEmail').value,password:$('#switchPassword').value});
    $('#switchPassword').value='';
    await showSignedIn(user);
  } catch(error) { $('#connectionFeedback').textContent=error.message; }
});
$('#switchLogout').addEventListener('click',async()=>{
  try{
    await controlRequest('/api/logout','POST',{});
    $('#switchLoginForm').hidden=false;
    $('#switchLogout').hidden=true;
    $('#connectionCards').replaceChildren();
    renderChatPlatforms();
    if(typeof clearInbox==='function')clearInbox();
    clearSwitchAgents();
    clearAiConnections();
    $('#addChatAppDetails').hidden=true;
    $('#connectionFeedback').textContent='Signed out of SwitchFlow. Sign in again to use your Switch workspace.';
  }catch(error){$('#connectionFeedback').textContent=error.message;}
});
renderChatPlatforms();
$('#refreshChatApps').addEventListener('click',async()=>{
  const button=$('#refreshChatApps');button.disabled=true;
  try{await refreshConnections();showToast('Connection status refreshed from Switch.');}
  catch(error){$('#chatConnectionCount').textContent=`Status unavailable: ${error.message}`;}
  finally{button.disabled=false;}
});
$('#chatConnectionForm').addEventListener('submit',async event => {
  event.preventDefault();
  const configuration={};
  const feedback=$('#chatConnectionFeedback');
  const button=$('#chatConnectionForm button[type="submit"]');
  feedback.textContent='Connecting app in Switch…';
  feedback.dataset.state='pending';
  button.disabled=true;
  for (const input of $('#connectionFields').querySelectorAll('input')) {
    if (input.type !== 'checkbox' && !input.value && !input.required) continue;
    configuration[input.dataset.configKey]=input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value;
  }
  try {
    const result = await controlRequest('/api/connections','POST',{bridge_type:$('#connectionPlatform').value,display_name:$('#connectionName').value,connection_config:configuration,channel_creation_enabled:$('#connectionCreateChannels').checked});
    await refreshConnections();
    feedback.dataset.state='success';
    feedback.textContent=`Connection added to Switch.${result.webhook_url ? ' Configure this webhook in your chat app: '+result.webhook_url : ''}`;
  } catch(error) {
    feedback.dataset.state='error';
    feedback.textContent=error.message;
  } finally {button.disabled=false;}
});
