import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {BusinessDataStore,extractFileProposal} from '../src/business-data.js';

test('signed-in owner uploads and edits a schedule entirely through the app API',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'switchflow-http-data-'));
  const switchServer=http.createServer((request,response)=>{
    if(request.url==='/gateway/auth/login'){
      response.writeHead(200,{'Content-Type':'application/json','Set-Cookie':'switch_session=test; HttpOnly'});
      response.end(JSON.stringify({id:'owner-a',name:'Owner',email:'owner@example.test'}));return;
    }
    response.writeHead(404,{'Content-Type':'application/json'});response.end('{}');
  });
  await new Promise(resolve=>switchServer.listen(0,'127.0.0.1',resolve));
  const reservation=http.createServer();
  await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));
  const port=reservation.address().port;
  await new Promise(resolve=>reservation.close(resolve));
  const child=spawn(process.execPath,['src/index.js'],{
    cwd:path.resolve(import.meta.dirname,'..'),
    env:{...process.env,SWITCHFLOW_STATE_PATH:path.join(directory,'state.json'),SWITCH_BASE_URL:`http://127.0.0.1:${switchServer.address().port}`,SWITCHFLOW_WEB_PORT:String(port)},
    stdio:'ignore',windowsHide:true,
  });
  const origin=`http://127.0.0.1:${port}`;
  try{
    let ready=false;
    for(let i=0;i<50;i++){
      try{const result=await fetch(origin+'/api/status');if(result.ok){ready=true;break;}}catch{}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.equal(ready,true,'SwitchFlow backend started');
    const login=await fetch(origin+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'owner@example.test',password:'test'})});
    assert.equal(login.status,200);
    const cookie=login.headers.get('set-cookie').split(';')[0];
    const headers={Cookie:cookie,'Content-Type':'application/json',Origin:origin};
    const upload=await fetch(origin+'/api/files',{method:'POST',headers,body:JSON.stringify({name:'staff-schedule.csv',base64:Buffer.from('Name,Shift\nSam,Evening\n').toString('base64')})});
    assert.equal(upload.status,201);
    const file=await upload.json();
    const edit=await fetch(origin+`/api/files/${file.id}`,{method:'PATCH',headers,body:JSON.stringify({version:1,row:1,column:1,value:'Morning'})});
    assert.equal(edit.status,200);
    const current=await fetch(origin+`/api/files/${file.id}`,{headers});
    assert.equal((await current.json()).rows[1][1],'Morning');
    const anonymous=await fetch(origin+'/api/files');
    assert.equal(anonymous.status,401);
  }finally{
    child.kill();await new Promise(resolve=>switchServer.close(resolve));
    fs.rmSync(directory,{recursive:true,force:true});
  }
});

test('owner approval applies only the proposed CSV change and records it in Switch',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'switchflow-approval-http-'));
  const store=new BusinessDataStore(directory);
  const file=store.add('owner-a',{name:'schedule.csv',base64:Buffer.from('Name,Shift\nSam,Evening\n').toString('base64')});
  const team={id:'team-1',ownerId:'owner-a',title:'Schedule update',workflow:{business:'Café',goal:'Update schedule',metric:'Correct shift',permission:'required',fileIds:[file.id]},roles:[{key:'analyst',kind:'analyst',name:'sf-test-analyst',displayName:'Analyst',description:'Review'}],agents:{analyst:{id:'analyst-1',name:'sf-test-analyst',apiKey:'test'}},room:{id:'room-1',name:'test-room'},startedAt:new Date().toISOString(),approvalPending:true};
  const proposal={fileId:file.id,expectedVersion:1,row:1,column:'Shift',value:'Morning',reason:'Opening cover'};
  team.pendingFileEdit=extractFileProposal(store,team,`FILE_EDIT_PROPOSAL: ${JSON.stringify(proposal)}`);
  fs.writeFileSync(path.join(directory,'business-teams.json'),JSON.stringify([team]));
  const messages=[];
  const switchServer=http.createServer(async(request,response)=>{
    if(request.url==='/gateway/auth/login'){
      response.writeHead(200,{'Content-Type':'application/json','Set-Cookie':'switch_session=test; HttpOnly'});
      response.end(JSON.stringify({id:'owner-a',name:'Owner',email:'owner@example.test'}));return;
    }
    if(request.url==='/gateway/chats/room-1/messages'){
      let body='';for await(const chunk of request)body+=chunk;
      messages.push(JSON.parse(body).body);
      response.writeHead(201,{'Content-Type':'application/json'});response.end('{}');return;
    }
    response.writeHead(404,{'Content-Type':'application/json'});response.end('{}');
  });
  await new Promise(resolve=>switchServer.listen(0,'127.0.0.1',resolve));
  const reservation=http.createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));
  const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const child=spawn(process.execPath,['src/index.js'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,SWITCHFLOW_STATE_PATH:path.join(directory,'state.json'),SWITCH_BASE_URL:`http://127.0.0.1:${switchServer.address().port}`,SWITCHFLOW_WEB_PORT:String(port)},stdio:'ignore',windowsHide:true});
  const origin=`http://127.0.0.1:${port}`;
  try{
    let ready=false;for(let i=0;i<50;i++){try{if((await fetch(origin+'/api/status')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
    assert.equal(ready,true);
    const login=await fetch(origin+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'owner@example.test',password:'test'})});
    const headers={Cookie:login.headers.get('set-cookie').split(';')[0],'Content-Type':'application/json',Origin:origin};
    const approval=await fetch(origin+'/api/approvals',{method:'POST',headers,body:JSON.stringify({teamId:team.id,decision:'approve'})});
    assert.equal(approval.status,200);
    assert.equal((await approval.json()).appliedFileChange.after,'Morning');
    assert.equal(store.content(file.id,'owner-a').rows[1][1],'Morning');
    assert.match(messages[0],/FILE UPDATE APPROVED/);
    assert.match(messages[1],/FILE UPDATE EXECUTED/);
    assert.equal(messages[2],'APPROVE');
    const duplicate=await fetch(origin+'/api/approvals',{method:'POST',headers,body:JSON.stringify({teamId:team.id,decision:'approve'})});
    assert.equal(duplicate.status,409);
  }finally{child.kill();await new Promise(resolve=>switchServer.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}
});
