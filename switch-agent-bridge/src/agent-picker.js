export function agentChoices(agents) {
  return agents.map(({id,name,display_name,description,known_agent_type,connector_type})=>({
    id,name,label:display_name||name,description,provider:known_agent_type||connector_type,
  }));
}

export async function resolveAgentChoices(gateway, ids = []) {
  if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!id)){
    throw Object.assign(new Error('Choose agents from your Switch workspace.'),{status:400});
  }
  if(!ids.length)return [];
  const choices=new Map(agentChoices(await gateway('/agents')).map(agent=>[agent.id,agent]));
  return [...new Set(ids)].map(id=>{
    const choice=choices.get(id);
    if(!choice)throw Object.assign(new Error('A selected agent is no longer available. Refresh the agent list and select again.'),{status:409});
    return choice;
  });
}

export async function agentCatalog(gateway) {
  const [agents,providers,controllers]=await Promise.all([
    gateway('/agents'),
    gateway('/management/providers'),
    gateway('/management/controllers').catch(error=>{
      if([403,404,501,503].includes(error.status))return [];
      throw error;
    }),
  ]);
  return {
    agents:agentChoices(agents),
    providers:providers.providers.map(({id,label})=>({id,label})),
    hosts:controllers.filter(host=>!host.revoked_at&&host.state==='online').map(({id,name})=>({id,name})),
  };
}

export async function createSwitchAgent(gateway, input) {
  const {provider,hostId}=input;
  const name=String(input.name??'').trim();
  const description=String(input.description??'').trim();
  if(!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(name)||!description||description.length>400||!hostId||!provider){
    throw Object.assign(new Error('Choose a provider and host, then enter a valid name and description.'),{status:400});
  }
  return gateway('/management/agents','POST',{
    name,description,controller_id:hostId,desired_state:'running',
    definition:{provider,auto_mode:false,auto_approve:false},
  });
}
