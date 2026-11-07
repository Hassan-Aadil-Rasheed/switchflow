export function normalizeConnection(item) {
  return {...item, id: item.bridge_id ?? item.id, type: item.bridge_type ?? item.type};
}

export async function resolveWorkflowConnection(gateway,workflow){
  const result = await gateway('/collaborations');
  const connections = (Array.isArray(result) ? result : result.bridges ?? []).map(normalizeConnection);
  const requested = (workflow.channels ?? []).map(name => String(name).toLowerCase().replace('microsoft ', ''));
  const active=connection=>connection.status!=='inactive'&&connection.status!=='disconnected';
  const bridge=workflow.connectionId
    ? connections.find(item=>item.id===workflow.connectionId&&active(item))
    : requested.map(type=>connections.find(item=>item.type===type&&active(item))).find(Boolean);
  if ((workflow.connectionId||requested.length) && !bridge) throw Object.assign(new Error('The selected chat app is not connected. Choose an active app in Flow builder.'), {status:409});
  const channelId = String(workflow.externalChannelId ?? '').trim();
  if ((bridge?.type==='telegram'||bridge?.channel_creation_supported===false) && !channelId) throw Object.assign(new Error(bridge?.type==='telegram'?'Enter your existing Telegram chat ID in Flow builder before generating the workflow.':'Enter an existing chat or channel ID in Flow builder before generating the workflow.'), {status:400});
  return bridge;
}

export async function prepareWorkflowRoom(gateway, workflow, agents) {
  const bridge=await resolveWorkflowConnection(gateway,workflow);
  const channelId=String(workflow.externalChannelId??'').trim();
  if (bridge && channelId) {
    const existing=await findLinkedRoom(gateway,bridge.id,channelId);
    if(existing){
      await gateway(`/rooms/${existing.id}/agents`, 'POST', {agent_ids:agents});
      return existing;
    }
  }
  return gateway('/rooms', 'POST', {
    name:`switchflow-${Date.now()}`, description:Array.from(String(workflow.goal||'')).slice(0,200).join(''),
    instructions:`Business: ${workflow.business}. Goal: ${workflow.goal}. Success: ${workflow.metric}. Control: ${workflow.permission}.`,
    agent_ids:agents, bridge_id:bridge?.id ?? null, internal_only:!bridge,
    channel_type:bridge ? 'channel_public' : null, external_channel_id:channelId || null,
  });
}

export async function findLinkedRoom(gateway, bridgeId, channelId) {
  const result=await gateway('/rooms');
  const rooms=Array.isArray(result)?result:result.rooms??[];
  for(const room of rooms.filter(item=>item.bridge_id===bridgeId)){
    const detail=await gateway(`/rooms/${room.id}`);
    if(String(detail.external_channel_id)===channelId)return detail;
  }
  return null;
}
