import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('counts connected platforms separately from accounts and excludes inactive accounts',()=>{
  const context=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../../dist/chat-platforms.js',import.meta.url),'utf8'),context);
  const result=context.SwitchFlowPlatforms.summarize([{bridge_type:'telegram',status:'active'},{type:'telegram',status:'active'},{type:'mattermost',status:'active'},{type:'discord',status:'inactive'},{type:'slack',status:'error'},{type:'teams',status:'disconnected'}]);
  assert.equal(result.cards.length,5);assert.equal(result.apps,2);assert.equal(result.accounts,3);
  assert.equal(result.cards.find(card=>card.key==='telegram').accounts.length,2);
  assert.equal(context.SwitchFlowPlatforms.summarize().apps,0);
});
