import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTeamPlan,buildTeam,acceptsHandoff} from '../src/team-builder.js';
const plan=()=>parseTeamPlan(JSON.stringify({title:'Pastry waste control',agents:[
  {kind:'architect',name:'Café coordinator',task:'Plan the café request'},
  {kind:'specialist',name:'Pastry demand analyst',task:'Analyze pastry demand and unsold stock'},
  {kind:'analyst',name:'Café risk reviewer',task:'Prepare the purchasing approval packet'},
  {kind:'operator',name:'Pastry order preparer',task:'Draft approved simulated ordering changes'},
  {kind:'verifier',name:'Waste outcome verifier',task:'Check the simulated artifact'},
]}));
test('builds unique business agents and preserves their owner',()=>{
  const team=buildTeam(plan(),'person-123',{business:'Café',goal:'Reduce unsold pastries'});
  assert.equal(team.ownerId,'person-123');assert.equal(team.roles.length,5);
  assert.equal(new Set(team.roles.map(role=>role.name)).size,5);
  assert.match(team.roles[0].instructions,/pastries/);
  assert.match(team.roles[0].instructions,new RegExp('@'+team.roles[1].name));
  assert.notEqual(team.id,buildTeam(plan(),'person-123',{}).id);
});
test('rejects teams without a human approval reviewer',()=>{
  assert.throws(()=>parseTeamPlan(JSON.stringify({agents:plan().agents.filter(agent=>agent.kind!=='analyst')})));
});
test('specialist handoffs cannot skip the approval reviewer',()=>{
  const team=buildTeam(plan(),'owner',{});const operator=team.roles.find(role=>role.kind==='operator');
  const specialist=team.roles.find(role=>role.kind==='specialist');const analyst=team.roles.find(role=>role.kind==='analyst');
  assert.equal(acceptsHandoff(operator,team,{senderName:specialist.name,body:'@'+operator.name},false),false);
  assert.equal(acceptsHandoff(operator,team,{senderName:analyst.name,body:'@'+operator.name},false),true);
  assert.equal(acceptsHandoff(analyst,team,{senderName:'human',body:'APPROVE',addressed:false},true),true);
});
