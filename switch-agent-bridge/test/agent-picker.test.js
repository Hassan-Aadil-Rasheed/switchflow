import test from 'node:test';
import assert from 'node:assert/strict';
import {agentCatalog,createSwitchAgent,resolveAgentChoices} from '../src/agent-picker.js';

const agents=[
  {id:'a',name:'stock',display_name:'Stock advisor',known_agent_type:'codex',api_key:'private'},
  {id:'b',name:'support',known_agent_type:'claude-code'},
];

test('catalog lists registered agents and all providers even without agent management',async()=>{
  const catalog=await agentCatalog(async route=>{
    if(route==='/agents')return agents;
    if(route==='/management/providers')return {providers:[{id:'codex',label:'Codex'},{id:'claude-code',label:'Claude Code'}]};
    throw Object.assign(new Error('Not found'),{status:404});
  });
  assert.deepEqual(catalog.providers.map(provider=>provider.label),['Codex','Claude Code']);
  assert.deepEqual(catalog.hosts,[]);
  assert.equal(catalog.agents[0].label,'Stock advisor');
  assert.equal('api_key' in catalog.agents[0],false);
});

test('resolves multiple agents without duplicates and refuses stale selections',async()=>{
  const gateway=async()=>agents;
  assert.deepEqual((await resolveAgentChoices(gateway,['b','a','b'])).map(agent=>agent.id),['b','a']);
  await assert.rejects(resolveAgentChoices(gateway,['b','missing']),{status:409});
  await assert.rejects(resolveAgentChoices(gateway,'a'),{status:400});
  assert.deepEqual(await resolveAgentChoices(()=>assert.fail('No lookup needed')),[]);
});

test('registers a named agent on a selected Switch host with automatic approval off',async()=>{
  const result=await createSwitchAgent(async (route,method,body)=>{
    assert.equal(route,'/management/agents');
    assert.equal(method,'POST');
    assert.equal(body.controller_id,'host');
    assert.equal(body.name,'stock-advisor');
    assert.deepEqual(body.definition,{provider:'codex',auto_mode:false,auto_approve:false});
    return {agent_id:'new-agent'};
  },{name:'stock-advisor',description:'Review stock',hostId:'host',provider:'codex'});
  assert.equal(result.agent_id,'new-agent');
});
