import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebsiteControl} from '../src/website-control.js';

test('requires a human session before forwarding a gateway action', async () => {
  const control = createWebsiteControl('http://127.0.0.1:1');
  await assert.rejects(control.gateway({headers:{}},'/collaborations'), error => error.status === 401);
});

test('keeps Switch cookie server-side and forwards it for human messages', async () => {
  const originalFetch = globalThis.fetch;
  let browserCookie;
  let forwarded;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/login')) return {
      ok:true, json:async()=>({name:'Demo person',email:'demo@example.test'}),
      headers:{getSetCookie:()=>['switch_session=private-value; HttpOnly; Path=/']},
    };
    forwarded = {url,options};
    return {ok:true,status:200,text:async()=>JSON.stringify({messages:[]})};
  };
  try {
    const control=createWebsiteControl('http://switch.test');
    const user=await control.login({}, {setHeader:(name,value)=>{browserCookie=value;}}, {email:'demo@example.test',password:'test'});
    assert.equal(user.name,'Demo person');
    assert.ok(!browserCookie.includes('private-value'));
    assert.match(browserCookie,/HttpOnly; SameSite=Strict/);
    await control.gateway({headers:{cookie:browserCookie.split(';')[0]}},'/chats/room/messages','POST',{body:'APPROVE'});
    assert.equal(forwarded.options.headers.Cookie,'switch_session=private-value');
    assert.equal(JSON.parse(forwarded.options.body).body,'APPROVE');
  } finally { globalThis.fetch=originalFetch; }
});

test('reports a plain-text Switch server failure without a JSON parsing error',async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>({ok:false,status:500,text:async()=> 'Internal Server Error'});
  try{
    const control=createWebsiteControl('http://switch.test');
    control.restoreSession({id:'a'.repeat(64),cookie:'switch_auth=private.jwt.token',user:{id:'owner',email:'owner@example.test'},expires:Date.now()+60_000});
    await assert.rejects(control.gateway({headers:{cookie:`switchflow_session=${'a'.repeat(64)}`}},'/rooms'),error=>error.status===500&&error.message==='Internal Server Error');
  }finally{globalThis.fetch=originalFetch;}
});

test('restores and signs out an unexpired SwitchFlow desktop session',()=>{
  const changes=[];
  const control=createWebsiteControl('http://switch.test',{onSessionChanged:value=>changes.push(value)});
  const value={id:'a'.repeat(64),cookie:'switch_auth=private.jwt.token',user:{id:'owner-1',email:'owner@example.test'},expires:Date.now()+60_000};
  assert.equal(control.restoreSession(value),true);
  const request={headers:{cookie:`switchflow_session=${value.id}`}};
  assert.equal(control.user(request).id,'owner-1');
  let cleared;
  assert.deepEqual(control.logout(request,{setHeader:(key,text)=>{cleared=text;}}),{ok:true});
  assert.match(cleared,/Max-Age=0/);
  assert.equal(changes.at(-1),null);
  assert.throws(()=>control.user(request),error=>error.status===401);
  assert.equal(control.restoreSession({...value,expires:Date.now()-1}),false);
});
