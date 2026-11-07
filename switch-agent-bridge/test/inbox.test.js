import test from 'node:test';import assert from 'node:assert/strict';import {inboxChats,inboxReply} from '../src/inbox.js';

test('the inbox shows only linked channels and keeps member previews after joining',()=>{
  const rooms=[
    {id:'telegram',name:'testing',bridge_id:'bot',bridge_type:'telegram',bridge_display_name:'My business Telegram'},
    {id:'discord',name:'Orders',bridge_id:'server',bridge_type:'discord'},
    {id:'internal',name:'Internal'},
    {id:'archived',bridge_id:'bot',bridge_type:'telegram',archived:true},
  ];
  const preview={senderName:'Customer',preview:'10 cookies'};
  const chats=inboxChats([{roomId:'discord',lastMessage:preview},{roomId:'welcome',name:'Welcome'}],rooms,[]);
  assert.deepEqual(chats.map(chat=>chat.roomId),['telegram','discord']);
  assert.equal(chats[0].needsJoin,true);
  assert.equal(chats[0].accountName,'My business Telegram');
  assert.equal(chats[0].channelName,'testing');
  assert.equal(chats[1].bridgeType,'discord');
  assert.equal(chats[1].needsJoin,false);
  assert.deepEqual(chats[1].lastMessage,preview);
});
test('a reply keeps its selected room, customer thread, and retry reference',async()=>{
  const calls=[];const gateway=async(route,method,body)=>{calls.push({route,method,body});return method==='POST'?{messages:[]}:{messages:[{messageId:'customer-root',roomId:'room-a'}]};};
  const requestId='ad66215d-7810-4c25-991f-8afe6a1f0772';
  await inboxReply(gateway,'room-a',{body:'Your order is ready',threadRootId:'customer-root',requestId});
  assert.equal(calls[1].route,'/chats/room-a/messages');assert.equal(calls[1].body.threadRootId,'customer-root');assert.equal(calls[1].body.requestId,requestId);
});
test('a customer thread from another app or channel cannot receive this reply',async()=>{
  let posted=false;const gateway=async(_route,method)=>{if(method==='POST')posted=true;return {messages:[{messageId:'customer-root',roomId:'room-b'}]};};
  await assert.rejects(inboxReply(gateway,'room-a',{body:'Hello',threadRootId:'customer-root'}),/Refresh Chats/);assert.equal(posted,false);
  await assert.rejects(inboxReply(gateway,'room-a',{body:'   '}),/Write a reply/);
});
