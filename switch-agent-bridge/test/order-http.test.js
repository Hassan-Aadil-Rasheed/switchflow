import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {BusinessDataStore} from '../src/business-data.js';

test('owner acceptance reserves capacity and replies in the customer thread',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'switchflow-order-http-'));
  const store=new BusinessDataStore(directory);
  const file=store.add('owner-a',{name:'capacity.csv',base64:Buffer.from('item,capacity,committed\ncookies,1200,100\n').toString('base64')});
  const order={id:'order-1',messageId:'customer-message-1',customerId:'customer-1',customerName:'Customer',quantity:1000,item:'cookies',request:'I want 1000 cookies',status:'checking',capacity:{status:'feasible'}};
  const team={id:'team-1',ownerId:'owner-a',title:'Customer orders',workflow:{business:'Bakery',goal:'Handle customer orders',metric:'Accepted orders',permission:'required',fileIds:[file.id]},roles:[],agents:{},room:{id:'room-1',name:'Bakery'},startedAt:new Date().toISOString(),approvalPending:true,order};
  fs.writeFileSync(path.join(directory,'business-teams.json'),JSON.stringify([team]));
  const sent=[];
  const switchServer=http.createServer(async(request,response)=>{
    if(request.url==='/gateway/auth/login'){
      response.writeHead(200,{'Content-Type':'application/json','Set-Cookie':'switch_auth=test; HttpOnly'});
      response.end(JSON.stringify({id:'owner-a',name:'Owner',email:'owner@example.test'}));return;
    }
    if(request.url==='/gateway/chats/room-1/messages'){
      let body='';for await(const chunk of request)body+=chunk;
      sent.push(JSON.parse(body));response.writeHead(201,{'Content-Type':'application/json'});response.end('{}');return;
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
    assert.equal(login.status,200);
    const headers={Cookie:login.headers.get('set-cookie').split(';')[0],'Content-Type':'application/json',Origin:origin};
    const [accept,duplicate]=await Promise.all([0,1].map(()=>fetch(origin+'/api/approvals',{method:'POST',headers,body:JSON.stringify({teamId:'team-1',decision:'approve'})})));
    assert.equal(accept.status,200);
    assert.equal(duplicate.status,409);
    assert.equal(store.content(file.id,'owner-a').rows[1][2],'1100');
    assert.equal(sent.length,1);
    assert.equal(sent[0].threadRootId,'customer-message-1');
    assert.equal(sent[0].requestId,'order-1');
    assert.match(sent[0].body,/Your 1000 cookies are confirmed\. You now have 1000 cookies in total\./);
    const again=await fetch(origin+'/api/approvals',{method:'POST',headers,body:JSON.stringify({teamId:'team-1',decision:'approve'})});
    assert.equal(again.status,409);
  }finally{child.kill();await new Promise(resolve=>switchServer.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}
});
