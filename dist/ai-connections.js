const aiProviderNames={openai:'OpenAI',anthropic:'Claude',gemini:'Gemini'};
let aiConnectionRequest=0;
let aiSaving=false;
function renderAiConnections(connections=[],signedIn=false){
  const cards=$('#aiProviderCards');
  cards.replaceChildren();
  $('#aiConnectionCount').textContent=signedIn?`${connections.length} AI providers connected`:'Sign in to see your AI connections.';
  const select=$('#workflowAiConnection');
  const previous=select.value;
  select.replaceChildren(new Option('Local Codex setup',''));
  for(const connection of connections)select.add(new Option(`${aiProviderNames[connection.provider]} · ${connection.model}`,connection.id));
  if(connections.some(item=>item.id===previous))select.value=previous;
  else if(!previous&&connections.length===1)select.value=connections[0].id;
  for(const [provider,name] of Object.entries(aiProviderNames)){
    const connection=connections.find(item=>item.provider===provider);
    const card=document.createElement('article');
    card.className='chat-platform-card';
    const title=document.createElement('h4');title.textContent=name;
    const animationAsset={openai:'openai.gif',anthropic:'claude.gif',gemini:'gemini.gif'}[provider];
    if(animationAsset){
      const animation=document.createElement('img');
      animation.className='ai-provider-animation';
      animation.src=`./assets/${animationAsset}`;
      animation.alt='';
      animation.width=96;
      animation.height=96;
      card.append(animation);
    }
    const status=document.createElement('p');status.textContent=connection?`Connected · ${connection.model}`:signedIn?'Ready to connect':'Sign in required';
    const button=document.createElement('button');button.type='button';button.className='button secondary';
    button.textContent=connection?'Update connection':`Connect ${name}`;
    button.disabled=!signedIn;
    button.addEventListener('click',()=>{
      if(aiSaving)return;
      $('#aiProviderId').value=provider;
      $('#aiModelId').value=connection?.model||'';
      $('#aiApiKey').value='';
      $('#aiConnectionFormTitle').textContent=`Connect ${name}`;
      $('#aiConnectionForm').hidden=false;
      $('#aiConnectionFeedback').textContent='';
      $('#aiModelId').focus();
    });
    card.append(title,status,button);
    if(connection){
      const disconnect=document.createElement('button');disconnect.type='button';disconnect.className='button ghost';disconnect.textContent='Disconnect';
      disconnect.addEventListener('click',async()=>{
        if(aiSaving)return;
        disconnect.disabled=true;
        try{
          await controlRequest(`/api/ai-connections/${connection.id}/disconnect`,'POST',{});
          await refreshAiConnections();
          $('#aiConnectionFeedback').textContent=`${name} disconnected. Workflows using it need a new AI connection before their next run.`;
        }catch(error){$('#aiConnectionFeedback').textContent=error.message;disconnect.disabled=false;}
      });
      card.append(disconnect);
    }
    cards.append(card);
  }
}
function clearAiConnections(){
  aiConnectionRequest++;
  $('#aiConnectionForm').hidden=true;
  $('#aiApiKey').value='';
  renderAiConnections();
}
async function refreshAiConnections(){
  const request=++aiConnectionRequest;
  try{
    const result=await controlRequest('/api/ai-connections');
    if(request===aiConnectionRequest)renderAiConnections(result.connections,true);
  }catch(error){
    if(request!==aiConnectionRequest)return;
    if(error.status===401)clearAiConnections();
    $('#aiConnectionFeedback').textContent=error.message;
  }
}
$('#refreshAiConnections').addEventListener('click',refreshAiConnections);
$('#cancelAiConnection').addEventListener('click',()=>{
  if(aiSaving)return;
  $('#aiApiKey').value='';$('#aiConnectionForm').hidden=true;
});
$('#aiConnectionForm').addEventListener('submit',async event=>{
  event.preventDefault();
  if(aiSaving)return;
  aiSaving=true;
  const request=aiConnectionRequest;
  const provider=$('#aiProviderId').value;
  const input={provider,model:$('#aiModelId').value,apiKey:$('#aiApiKey').value};
  $('#aiApiKey').value='';
  $('#saveAiConnection').disabled=true;
  $('#aiConnectionFeedback').textContent='Testing the AI model and saving the encrypted connection…';
  try{
    await controlRequest('/api/ai-connections','POST',input);
    if(request!==aiConnectionRequest)return;
    $('#aiConnectionForm').hidden=true;
    await refreshAiConnections();
    $('#aiConnectionFeedback').textContent=`${aiProviderNames[provider]} connected. Choose it under AI for this workflow.`;
  }catch(error){if(request===aiConnectionRequest)$('#aiConnectionFeedback').textContent=error.message;}
  finally{input.apiKey='';aiSaving=false;$('#saveAiConnection').disabled=false;}
});
renderAiConnections();
