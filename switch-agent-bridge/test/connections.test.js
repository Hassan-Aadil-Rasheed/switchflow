import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeConnection,prepareWorkflowRoom,resolveWorkflowConnection} from '../src/connections.js';
test('matches Switch gateway bridge field names',()=>{
  const value=normalizeConnection({bridge_id:'telegram-1',bridge_type:'telegram',status:'active'});
  assert.equal(value.id,'telegram-1');assert.equal(value.type,'telegram');
});
test('requires the Telegram group ID before any room or agent is created',async()=>{
  const gateway=async route=>route==='/collaborations'?[{bridge_id:'tg',bridge_type:'telegram',status:'active'}]:[];
  await assert.rejects(resolveWorkflowConnection(gateway,{connectionId:'tg',externalChannelId:''}),error=>error.status===400&&/before generating/.test(error.message));
});
test('uses the exact connected app chosen by the owner',async()=>{
  const calls=[];
  const gateway=async(route,method,body)=>{
    calls.push({route,method,body});
    if(route==='/collaborations')return [
      {bridge_id:'discord-1',bridge_type:'discord',status:'active',channel_creation_supported:true},
      {bridge_id:'discord-2',bridge_type:'discord',status:'active',channel_creation_supported:true},
    ];
    return {id:'room-2',name:'test'};
  };
  await prepareWorkflowRoom(gateway,{connectionId:'discord-2',channels:['Discord'],externalChannelId:'',goal:'Test'},['agent']);
  assert.equal(calls.at(-1).body.bridge_id,'discord-2');
});
test('keeps Mattermost channel purpose short while preserving the full goal',async()=>{
  const longGoal='Plan a sample café workflow. '.repeat(20);
  let created;
  const gateway=async(route,method,body)=>{
    if(route==='/collaborations')return [{bridge_id:'mm',bridge_type:'mattermost',status:'active'}];
    if(route==='/rooms'&&method==='POST'){created=body;return {id:'room',name:'test'};}
  };
  await prepareWorkflowRoom(gateway,{connectionId:'mm',goal:longGoal,metric:'Clear plan',permission:'required',business:'Café'},['agent']);
  assert.ok(created.description.length<=200);
  assert.ok(created.instructions.includes(longGoal));
});
test('reuses a linked Telegram group and adds agents instead of creating duplicate room',async()=>{
  const calls=[];
  const gateway=async(route,method,body)=>{
    calls.push({route,method,body});
    if(route==='/collaborations')return [{bridge_id:'tg',bridge_type:'telegram',status:'active',channel_creation_supported:false}];
    if(route==='/rooms')return [{id:'existing',bridge_id:'tg'}];
    if(route==='/rooms/existing')return {id:'existing',name:'testing',external_channel_id:'-5567732321'};
    return {};
  };
  const room=await prepareWorkflowRoom(gateway,{channels:['Telegram'],externalChannelId:'-5567732321'},['a','b','c','d']);
  assert.equal(room.id,'existing');assert.deepEqual(calls.at(-1).body.agent_ids,['a','b','c','d']);
  assert.ok(!calls.some(call=>call.route==='/rooms'&&call.method==='POST'));
});
