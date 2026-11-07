import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {BusinessDataStore} from '../src/business-data.js';
import {contextFileMessages,importChatFiles} from '../src/chat-file-import.js';

test('imports a Telegram or Discord room attachment once into the owner workspace',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'switchflow-chat-file-'));
  try{
    const businessData=new BusinessDataStore(directory);
    const team={id:'team-1',ownerId:'owner-1',room:{id:'room-1'},roles:[{name:'switchflow-architect'}]};
    const agent={id:'agent-1'};
    const bytes=Buffer.from('date,covers\n2026-11-05,23\n');
    const attachment={filename:'schedule.csv',mxc:'mxc://example/schedule',size:bytes.length};
    const message={senderName:'Café manager',senderType:'unknown',attachments:[attachment]};
    const events=[];let saves=0;let downloads=0;
    const options={message,team,agent,businessData,saveTeams:()=>saves++,broadcast:event=>events.push(event),api:{downloadMedia:async()=>{downloads++;return bytes;}}};
    const first=await importChatFiles(options);
    const second=await importChatFiles(options);
    assert.equal(first[0].status,'imported');
    assert.deepEqual(second,[]);
    assert.equal(downloads,1);
    assert.equal(saves,1);
    assert.equal(events[0].ownerId,'owner-1');
    assert.equal(businessData.list('owner-1')[0].source.kind,'chat');
    assert.equal(businessData.list('owner-2').length,0);
    assert.equal(businessData.content(first[0].fileId,'owner-1').text,bytes.toString());
    assert.deepEqual(team.workflow?.fileIds,undefined);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('rejects oversized and invalid chat files without storing them',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'switchflow-chat-file-'));
  try{
    const store=new BusinessDataStore(directory);
    const team={id:'team-1',ownerId:'owner-1',room:{id:'room-1'},roles:[]};
    const events=[];
    const options={team,agent:{},businessData:store,saveTeams:()=>{},broadcast:event=>events.push(event),api:{downloadMedia:async()=>{throw new Error('should not download');}}};
    const results=await importChatFiles({...options,message:{senderType:'user',senderName:'Owner',attachments:[
      {filename:'too-large.csv',mxc:'mxc://example/large',size:1_000_001},
      {filename:'program.exe',mxc:'mxc://example/program',size:10},
    ]}});
    assert.equal(results.length,1);
    assert.equal(results[0].status,'failed');
    assert.equal(events.length,1);
    assert.equal(store.list('owner-1').length,0);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('finds attachments in recent Switch room history',()=>{
  const messages=contextFileMessages({threads:[{root:{id:'one',sender_name:'Owner',sender_kind:'user',attachments:[{filename:'inventory.csv',mxc:'mxc://a',size:2}]},replies:[{id:'two',attachments:[]}]}]});
  assert.equal(messages.length,1);
  assert.equal(messages[0].messageId,'one');
  assert.equal(messages[0].attachments[0].filename,'inventory.csv');
});
