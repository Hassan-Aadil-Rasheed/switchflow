import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import discovery from '../src/local-switch.cjs';
test('discovers the current Switch API port after a fresh local installation',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'switch-port-'));const configDirectory=path.join(directory,'switchdash','local-switch-server');fs.mkdirSync(configDirectory,{recursive:true});
  try{
    fs.writeFileSync(path.join(configDirectory,'ports.json'),JSON.stringify({gateway:53275,api:53276}));
    assert.equal(discovery.localSwitchUrl({appData:directory,override:''}),'http://127.0.0.1:53276');
    assert.equal(discovery.localSwitchUrl({appData:directory,override:'http://127.0.0.1:6000/'}),'http://127.0.0.1:6000');
    fs.writeFileSync(path.join(configDirectory,'ports.json'),JSON.stringify({api:999999}));
    assert.equal(discovery.localSwitchUrl({appData:directory,override:''}),'http://127.0.0.1:61512');
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
