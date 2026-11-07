import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {AiConnections,generateAi} from '../src/ai-connections.js';

test('AI connection keys survive encrypted storage and stay private to their owner',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'switchflow-ai-'));
  const key=crypto.randomBytes(32);
  const encrypt=value=>{
    const iv=crypto.randomBytes(12);
    const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
    const encrypted=Buffer.concat([cipher.update(value),cipher.final()]);
    return Buffer.concat([iv,cipher.getAuthTag(),encrypted]);
  };
  const decrypt=value=>{
    const decipher=crypto.createDecipheriv('aes-256-gcm',key,value.subarray(0,12));
    decipher.setAuthTag(value.subarray(12,28));
    return Buffer.concat([decipher.update(value.subarray(28)),decipher.final()]);
  };
  const store=new AiConnections(directory,{encrypt,decrypt,generate:async()=> 'OK'});
  try{
    await Promise.all([
      store.save('owner-a',{provider:'openai',model:'test-model',apiKey:'secret-alpha'}),
      store.save('owner-b',{provider:'gemini',model:'other-model',apiKey:'secret-beta'}),
    ]);
    assert.equal(fs.readFileSync(store.file).includes(Buffer.from('secret-alpha')),false);
    const saved=await store.list('owner-a');
    assert.equal(saved.length,1);
    assert.equal(JSON.stringify(saved).includes('secret-alpha'),false);
    assert.equal((await store.get('owner-a',saved[0].id)).apiKey,'secret-alpha');
    await assert.rejects(store.get('owner-b',saved[0].id),{status:409});
    await assert.rejects(store.remove('owner-b',saved[0].id),{status:404});
    await store.save('owner-a',{provider:'openai',model:'new-model',apiKey:'replacement'});
    assert.equal((await store.list('owner-a'))[0].id,saved[0].id);
    await store.remove('owner-a',saved[0].id);
    assert.equal((await store.list('owner-b')).length,1);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('Windows encrypts saved AI credentials for the current user', {skip:process.platform!=='win32'},async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'switchflow-dpapi-'));
  try{
    const store=new AiConnections(directory,{generate:async()=> 'OK'});
    await store.save('owner',{provider:'openai',model:'test-model',apiKey:'dummy-test-secret'});
    assert.equal(fs.readFileSync(store.file).includes(Buffer.from('dummy-test-secret')),false);
    const [connection]=await new AiConnections(directory).list('owner');
    assert.equal(connection.model,'test-model');
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('selected providers receive the requested model and return the correct text',async()=>{
  const replies={
    openai:{output:[{type:'message',content:[{type:'output_text',text:'OpenAI result'}]}]},
    anthropic:{content:[{type:'text',text:'Claude result'}]},
    gemini:{candidates:[{content:{parts:[{thought:true,text:'Hidden reasoning'},{text:'Gemini result'}]}}]},
  };
  for(const provider of Object.keys(replies)){
    const answer=await generateAi({provider,model:'selected-model',apiKey:'test-key'},'business prompt',async(url,options)=>{
      assert.equal(options.method,'POST');
      const body=JSON.parse(options.body);
      if(provider==='gemini'){
        assert.match(url,/models\/selected-model:generateContent$/);
        assert.equal(options.headers['x-goog-api-key'],'test-key');
      }else assert.equal(body.model,'selected-model');
      if(provider==='openai')assert.equal(body.store,false);
      return {ok:true,json:async()=>replies[provider]};
    });
    assert.match(answer,/result$/);
    assert.equal(answer.includes('Hidden reasoning'),false);
  }
  await assert.rejects(generateAi({provider:'openai',model:'model',apiKey:'private'},'prompt',async()=>({ok:false,status:401})),error=>!error.message.includes('private')&&error.message.includes('401'));
});

test('a failed provider test keeps the previously saved connection intact',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'switchflow-ai-fail-'));
  const store=new AiConnections(directory,{encrypt:value=>value,decrypt:value=>value,generate:async()=> 'OK'});
  try{
    await store.save('owner',{provider:'openai',model:'original',apiKey:'valid'});
    store.generate=async()=>{throw new Error('API unavailable');};
    await assert.rejects(store.save('owner',{provider:'openai',model:'new',apiKey:'invalid'}),/API unavailable/);
    assert.equal((await store.list('owner'))[0].model,'original');
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
