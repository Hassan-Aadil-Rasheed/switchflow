import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('an approval arriving before team selection binds the owner team before rendering',async()=>{
  const source=fs.readFileSync(new URL('../../dist/app.js',import.meta.url),'utf8');
  const handler=source.slice(source.indexOf('async function handleLiveEvent('),source.indexOf('function connectToSwitch('));
  const team={id:'team-cookie',title:'Cookie orders',workflow:{business:'Bakery'},order:{id:'order-10',status:'pending'},agents:[],files:[]};
  const appState={teamId:null,workflow:null};let renderedTeam;
  const context=vm.createContext({appState,controlRequest:async()=>[team],setPhase(){},renderApproval(){renderedTeam=appState.teamId;},showToast(){},pushEvent(){},$:()=>({textContent:'',classList:{remove(){}}})});
  vm.runInContext(handler,context);
  await context.handleLiveEvent({type:'room_message',teamId:team.id,kind:'analyst',sender:'sf-analyst',body:'APPROVAL REQUIRED',order:team.order});
  assert.equal(renderedTeam,team.id);
  assert.equal(appState.teamId,team.id);
  assert.equal(appState.order.id,'order-10');
  await context.handleLiveEvent({type:'room_message',teamId:'another-team',kind:'analyst',body:'APPROVAL REQUIRED',order:{id:'wrong'}});
  assert.equal(appState.order.id,'order-10');
});

test('a new customer order appears in Approvals while its capacity is checked',async()=>{
  const source=fs.readFileSync(new URL('../../dist/app.js',import.meta.url),'utf8');
  const handler=source.slice(source.indexOf('async function handleLiveEvent('),source.indexOf('function connectToSwitch('));
  const order={id:'order-10',customerName:'Customer',quantity:10,item:'cookies',status:'checking'};
  const team={id:'team-cookie',title:'Cookie orders',workflow:{business:'Bakery'},order,agents:[],files:[]};
  const appState={teamId:null,workflow:null,approvalPending:false};let rendered=false;
  const context=vm.createContext({appState,controlRequest:async()=>[team],setPhase(){},renderApproval(){rendered=appState.approvalPending;},showToast(){},pushEvent(){},$:()=>({textContent:'',classList:{remove(){}}})});
  vm.runInContext(handler,context);
  await context.handleLiveEvent({type:'order',teamId:team.id,order});
  assert.equal(appState.teamId,team.id);
  assert.equal(rendered,true);
});

test('the owner can accept a feasible recorded order while the agent check is pending',()=>{
  const source=fs.readFileSync(new URL('../../dist/app.js',import.meta.url),'utf8');
  const renderer=source.slice(source.indexOf('function renderApproval()'),source.indexOf('function openTeamApproval('));
  const nodes=new Map();
  const element=selector=>{
    if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',addEventListener(){}});
    return nodes.get(selector);
  };
  const appState={approvalPending:true,order:{customerName:'Customer',quantity:10,item:'cookies',status:'checking',capacity:{status:'feasible',available:1100}},workflow:{}};
  const context=vm.createContext({appState,$:element,escapeHtml:value=>String(value),approveAction(){},rejectAction(){}});
  vm.runInContext(renderer,context);
  context.renderApproval();
  assert.match(element('#approvalList').innerHTML,/id="approveButton"[^>]*>Accept order<\/button>/);
  assert.doesNotMatch(element('#approvalList').innerHTML,/id="approveButton"[^>]*disabled/);
});
