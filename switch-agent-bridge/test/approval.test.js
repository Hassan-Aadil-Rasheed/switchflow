import test from 'node:test';
import assert from 'node:assert/strict';
import {isHumanApproval} from '../src/approval.js';
import {acceptsHandoff} from '../src/team-builder.js';

test('owner approval reaches a generated team analyst and agent approval cannot',()=>{
  const analyst={kind:'analyst',name:'sf-cafe-analyst'};
  const team={roles:[{kind:'architect',name:'sf-cafe-architect'},analyst,{kind:'operator',name:'sf-cafe-operator'}]};
  const owner={senderName:'Admin',senderType:'user',body:'APPROVE',addressed:true};
  const approval=isHumanApproval(owner,'APPROVE',team.roles.map(role=>role.name));
  assert.equal(approval,true);
  assert.equal(isHumanApproval({...owner,body:'@sf-cafe-analyst APPROVE'},'APPROVE',team.roles.map(role=>role.name)),true);
  assert.equal(acceptsHandoff(analyst,team,owner,approval),true);
  assert.equal(isHumanApproval({...owner,senderName:'sf-cafe-operator',senderType:'agent'},'APPROVE',team.roles.map(role=>role.name)),false);
  assert.equal(isHumanApproval({...owner,body:'APPROVE another proposal'},'APPROVE',team.roles.map(role=>role.name)),false);
});
