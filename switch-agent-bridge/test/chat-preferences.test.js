import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ChatPreferences} from '../src/chat-preferences.js';

test('remembers each chat destination for the signed-in owner only',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'switchflow-chat-preferences-'));
  try{
    let preferences=new ChatPreferences(directory);
    preferences.set('owner-1',{connectionId:'telegram-1',channelId:'-100123'});
    preferences.set('owner-1',{connectionId:'discord-1',channelId:'channel-5'});
    preferences=new ChatPreferences(directory);
    assert.equal(preferences.get('owner-1').connectionId,'discord-1');
    assert.deepEqual(preferences.get('owner-1').destinations,{'telegram-1':'-100123','discord-1':'channel-5'});
    assert.deepEqual(preferences.get('owner-2').destinations,{});
    preferences.set('owner-1',{connectionId:'discord-1',channelId:''});
    assert.equal(preferences.get('owner-1').destinations['discord-1'],undefined);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
