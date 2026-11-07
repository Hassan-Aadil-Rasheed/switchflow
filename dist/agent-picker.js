const selectedSwitchAgents=()=>$$('#switchAgentChoices input:checked').map(input=>input.value);
function updateSwitchAgentCount(){
  $('#switchAgentCount').textContent=`${selectedSwitchAgents().length} selected`;
}

let agentCatalogRequest=0;
function clearSwitchAgents(){
  agentCatalogRequest++;
  $('#switchAgentChoices').replaceChildren();
  $('#switchProviderFields').hidden=true;
  $('#switchAgentStatus').textContent='Sign in to load agents from Switch.';
  $('#switchProviderStatus').textContent='Sign in to view available providers.';
  updateSwitchAgentCount();
}

async function refreshSwitchAgents(selectId){
  const request=++agentCatalogRequest;
  const status=$('#switchAgentStatus');
  status.textContent='Loading agents from Switch…';
  try{
    const {agents,providers,hosts}=await controlRequest('/api/agent-picker');
    if(request!==agentCatalogRequest)return;
    const selected=new Set(selectedSwitchAgents());
    if(selectId)selected.add(selectId);
    const choices=$('#switchAgentChoices');
    choices.replaceChildren();
    const providerNames=new Map(providers.map(provider=>[provider.id,provider.label]));
    for(const agent of agents){
      const label=document.createElement('label');
      label.className='agent-choice';
      const checkbox=document.createElement('input');
      checkbox.type='checkbox';
      checkbox.name='switchAgentIds';
      checkbox.value=agent.id;
      checkbox.checked=selected.has(agent.id);
      const copy=document.createElement('span');
      const title=document.createElement('strong');
      title.textContent=agent.label;
      const details=document.createElement('small');
      details.textContent=[`@${agent.name}`,providerNames.get(agent.provider)||agent.provider].filter(Boolean).join(' · ');
      if(agent.description)label.title=agent.description;
      copy.append(title,details);
      label.append(checkbox,copy);
      choices.append(label);
    }
    updateSwitchAgentCount();
    status.textContent=agents.length?`${agents.length} agents available in this Switch workspace.`:'There are no registered agents in this Switch workspace yet.';
    for(const [selector,items] of [['#switchAgentProvider',providers],['#switchAgentHost',hosts]]){
      const select=$(selector);
      const value=select.value;
      select.replaceChildren(...items.map(item=>new Option(item.label||item.name,item.id)));
      if(items.some(item=>item.id===value))select.value=value;
    }
    $('#switchProviderFields').hidden=!providers.length;
    $('#switchAgentHostFields').hidden=!hosts.length;
    $('#switchProviderStatus').textContent=hosts.length
      ? 'Choose a host where the provider is installed and signed in.'
      : 'No managed host is online. To run an agent on this computer, add it in Switch Console → Your Agents, then return here and refresh.';
  }catch(error){
    if(request!==agentCatalogRequest)return;
    if(error.status===401)clearSwitchAgents();
    else status.textContent=`Cannot load agents: ${error.message}`;
  }
}

$('#switchAgentChoices').addEventListener('change',updateSwitchAgentCount);
$('#refreshSwitchAgents').addEventListener('click',()=>refreshSwitchAgents());
$('#createSwitchAgent').addEventListener('click',async()=>{
  const button=$('#createSwitchAgent');
  const status=$('#switchProviderStatus');
  const name=$('#switchAgentName');
  const description=$('#switchAgentDescription');
  button.disabled=true;
  status.textContent='Creating the agent in Switch…';
  try{
    const {id}=await controlRequest('/api/agent-picker','POST',{
      provider:$('#switchAgentProvider').value,hostId:$('#switchAgentHost').value,
      name:name.value,description:description.value,
    });
    name.value='';description.value='';
    await refreshSwitchAgents(id);
    $('#switchAgentStatus').textContent=`Agent created. ${$('#switchAgentCount').textContent} for this workflow.`;
  }catch(error){status.textContent=error.message;}
  finally{button.disabled=false;}
});
