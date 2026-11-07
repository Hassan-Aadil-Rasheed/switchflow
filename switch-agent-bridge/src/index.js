import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { config, projectDirectory, readState, statePath } from "./config.js";
import { agentNameSet, roles } from "./roles.js";
import { buildPrompt, prepareRoomEvidence, runCodex } from "./codex-runner.js";
import { messageFromFrame, SwitchApi } from "./switch-api.js";
import { isHumanApproval } from "./approval.js";
import {inboxChats,inboxReply} from './inbox.js';
import {agentCatalog,createSwitchAgent,resolveAgentChoices} from './agent-picker.js';
import {AiConnections,aiProviders,generateAi} from './ai-connections.js';
import { createWebsiteControl } from "./website-control.js";
import { findLinkedRoom, prepareWorkflowRoom, resolveWorkflowConnection, normalizeConnection } from "./connections.js";
import {ChatPreferences} from './chat-preferences.js';
import {parseTeamPlan,teamPlanPrompt,buildTeam,acceptsHandoff} from './team-builder.js';
import {BusinessDataStore,extractFileProposal} from './business-data.js';
import {contextFileMessages,importChatFiles} from './chat-file-import.js';
import {scheduleFor,localClock,scheduleIsDue} from './workflow-schedule.js';
import {orderRequest,capacityProposal,capacityFromFiles,orderApprovalMessage} from './orders.js';

const state = fs.existsSync(statePath) ? readState() : {baseUrl:config.baseUrl,room:{id:null,name:'No workflow yet'},agents:{}};
const api = new SwitchApi(config.baseUrl);
const control = createWebsiteControl(config.baseUrl, {
  onSessionChanged(value) { if (process.send) process.send({type:'switch-session-save',value}); },
});
if(process.send){
  process.on('message',message=>{
    if(message?.type==='switch-session-restore'){
      const restored=control.restoreSession(message.value);
      process.send({type:'switch-session-restored',restored,id:restored?message.value.id:null,expires:restored?message.value.expires:null});
      if(restored)control.refreshSessions().catch(()=>{});
    }
  });
  process.send({type:'switch-session-ready'});
}
const seenMessages = new Set();
const broadcastedMessageIds = new Set();
const eventClients = new Set();
const connectedRoles = new Set();
const websiteDirectory = path.resolve(projectDirectory, "..", "dist");
const teamsPath=path.join(path.dirname(statePath),'business-teams.json');
const teams=new Map(fs.existsSync(teamsPath)?JSON.parse(fs.readFileSync(teamsPath,'utf8')).map(team=>[team.id,team]):[]);
let restoredOrderApproval=false;
for(const team of teams.values()){
  if(['checking','pending'].includes(team.order?.status)){
    if(!team.approvalPending||team.completedAt)restoredOrderApproval=true;
    if(team.order.status==='checking'&&!team.order.agentAssessment){
      team.order.agentAssessment={status:'unknown',evidence:team.order.capacity?.evidence||'No capacity record was found.',limitation:'The earlier analyst response was not parsed. Verify fulfillment time, usable stock, recipe, staff, equipment, and other commitments before accepting.'};
      team.order.status='pending';restoredOrderApproval=true;
    }
    team.approvalPending=true;team.completedAt=null;
  }
}
if(restoredOrderApproval)saveTeams();
const businessData=new BusinessDataStore(path.dirname(statePath));
const chatPreferences=new ChatPreferences(path.dirname(statePath));
const aiConnections=new AiConnections(path.dirname(statePath));
async function runWorkflowAi(ownerId,workflow,role,prompt){
  if(!workflow?.aiConnectionId)return runCodex(role,prompt);
  const connection=await aiConnections.get(ownerId,workflow.aiConnectionId);
  return generateAi({...connection,model:workflow.aiModel||connection.model},prompt);
}
const drafts=new Map();
const runtimes=[];
const scheduledTeams=new Set();
const approvalRequests=new Set();
const removingTeams=new Set();
function saveTeams(){fs.writeFileSync(teamsPath,JSON.stringify([...teams.values()],null,2),{mode:0o600});}
async function ensureWorkRoom(request,team){
  if(!team.room||team.workRoom)return;
  const room=await control.gateway(request,'/rooms','POST',{
    name:`switchflow-work-${team.id.slice(0,8)}`,
    description:`Private agent workflow for ${team.title}`,
    instructions:`Business: ${team.workflow.business}. Goal: ${team.workflow.goal}. Owner decisions are made in SwitchFlow. Customer updates go to the linked customer room.`,
    agent_ids:Object.values(team.agents).map(agent=>agent.id),internal_only:true,
  });
  team.workRoom={id:room.id,name:room.name};saveTeams();
  await control.joinRoom(request,room.id);
}
function publicTeam(team){return {id:team.id,title:team.title,room:team.room,startedAt:team.startedAt,completedAt:team.completedAt,approvalPending:team.approvalPending===true,orderMode:team.orderMode===true,order:team.order||null,schedule:team.schedule,fileProposal:team.pendingFileEdit||null,workflow:{business:team.workflow.business,goal:team.workflow.goal,metric:team.workflow.metric,trigger:team.workflow.trigger,permission:team.workflow.permission},files:(team.workflow.fileIds||[]).map(id=>{try{return businessData.summary(id,team.ownerId).name;}catch{return 'Unavailable file';}}),agents:team.roles.map(role=>({name:role.name,displayName:role.displayName,description:role.description,kind:role.kind,id:team.agents[role.key]?.id}))};}
function ownedTeam(request,id){const team=teams.get(id);if(!team||team.ownerId!==control.user(request).id)throw Object.assign(new Error('Select a team belonging to your signed-in account.'),{status:403});return team;}
function fileEvidence(workflow,ownerId){return (workflow.fileIds||[]).map(id=>businessData.summary(id,ownerId));}
function evidenceText(workflow,ownerId){return JSON.stringify(fileEvidence(workflow,ownerId)).slice(0,24000);}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".yaml": "application/yaml; charset=utf-8",
};

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

function broadcast(event) {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of eventClients) if(!event.ownerId||client.ownerId===event.ownerId) client.response.write(line);
}

async function readJson(request,limit=64_000) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > limit) throw Object.assign(new Error("Request is too large."),{status:413});
  }
  return body ? JSON.parse(body) : {};
}

function serveWebsite(request, response) {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(websiteDirectory, requested);
  if (!filePath.startsWith(`${websiteDirectory}${path.sep}`) || !fs.existsSync(filePath)) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }
  response.writeHead(200, {
    "Content-Type": contentTypes[path.extname(filePath)] ?? "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  fs.createReadStream(filePath).pipe(response);
}

function startWebServer() {
  const server = http.createServer(async (request, response) => {
    try {
      if (![`127.0.0.1:${config.webPort}`, `localhost:${config.webPort}`].includes(request.headers.host)) {
        sendJson(response, 403, {error: 'Use the local SwitchFlow address.'}); return;
      }
      const url = new URL(request.url, "http://127.0.0.1");
      if (request.method === 'POST') {
        const origin = request.headers.origin;
        if (origin && origin !== `http://${request.headers.host}`) {
          sendJson(response, 403, {error: 'Open SwitchFlow from its desktop application.'}); return;
        }
      }
      if (request.method === 'POST' && url.pathname === '/api/login') {
        sendJson(response, 200, await control.login(request, response, await readJson(request))); return;
      }
      if(request.method==='GET'&&url.pathname==='/api/session'){
        const user=control.user(request);
        sendJson(response,200,{name:user.name,email:user.email});return;
      }
      if(request.method==='POST'&&url.pathname==='/api/logout'){
        sendJson(response,200,control.logout(request,response));return;
      }
      if(url.pathname==='/api/ai-connections'){
        const owner=control.user(request);
        if(request.method==='GET'){
          sendJson(response,200,{providers:aiProviders,connections:await aiConnections.list(owner.id)});return;
        }
        if(request.method==='POST'){
          await aiConnections.save(owner.id,await readJson(request));
          sendJson(response,200,{connections:await aiConnections.list(owner.id)});return;
        }
      }
      const aiDisconnect=url.pathname.match(/^\/api\/ai-connections\/([a-f0-9-]+)\/disconnect$/);
      if(aiDisconnect&&request.method==='POST'){
        await aiConnections.remove(control.user(request).id,aiDisconnect[1]);
        sendJson(response,200,{ok:true});return;
      }
      if(url.pathname==='/api/agent-picker'){
        const gateway=(route,method,body)=>control.gateway(request,route,method,body);
        if(request.method==='GET'){sendJson(response,200,await agentCatalog(gateway));return;}
        if(request.method==='POST'){
          const agent=await createSwitchAgent(gateway,await readJson(request));
          sendJson(response,201,{id:agent.agent_id});return;
        }
      }
      if(request.method==='GET'&&url.pathname==='/api/files'){
        sendJson(response,200,businessData.list(control.user(request).id));return;
      }
      if(request.method==='POST'&&url.pathname==='/api/files'){
        const owner=control.user(request);
        sendJson(response,201,await businessData.add(owner.id,await readJson(request,1_500_000)));return;
      }
      if(request.method==='POST'&&url.pathname==='/api/chat-preferences'){
        const owner=control.user(request);
        const input=await readJson(request);
        const result=await control.gateway(request,'/collaborations');
        const connections=(Array.isArray(result)?result:result.bridges??[]).map(normalizeConnection);
        if(!connections.some(item=>item.id===input.connectionId&&item.status!=='inactive'&&item.status!=='disconnected'))throw Object.assign(new Error('Choose an active chat app.'),{status:400});
        sendJson(response,200,chatPreferences.set(owner.id,input));return;
      }
      const fileRoute=url.pathname.match(/^\/api\/files\/([a-f0-9-]+)$/);
      if(fileRoute&&request.method==='GET'){
        sendJson(response,200,businessData.content(fileRoute[1],control.user(request).id));return;
      }
      if(fileRoute&&request.method==='PATCH'){
        sendJson(response,200,businessData.updateCell(fileRoute[1],control.user(request).id,await readJson(request)));return;
      }
      if(request.method==='POST'&&url.pathname==='/api/plans'){
        const owner=control.user(request);
        const workflow=await readJson(request);
        if(workflow.aiConnectionId){
          const connection=await aiConnections.get(owner.id,workflow.aiConnectionId);
          workflow.aiModel=connection.model;
          workflow.aiProvider=connection.provider;
        }
        if(typeof workflow.goal!=='string'||!workflow.goal.trim()||workflow.goal.length>4000)throw Object.assign(new Error('Describe your business goal in 1–4,000 characters.'),{status:400});
        if(!Array.isArray(workflow.fileIds)||workflow.fileIds.length>5)throw Object.assign(new Error('Select up to five uploaded files.'),{status:400});
        const chosenAgents=await resolveAgentChoices(route=>control.gateway(request,route),workflow.switchAgentIds);
        workflow.switchAgentIds=chosenAgents.map(agent=>agent.id);
        scheduleFor(workflow);
        const selectedConnection=await resolveWorkflowConnection((route,method,body)=>control.gateway(request,route,method,body),workflow);
        if(!selectedConnection)throw Object.assign(new Error('Choose a connected chat app in Flow builder before generating the workflow.'),{status:400});
        chatPreferences.set(owner.id,{connectionId:selectedConnection.id,channelId:String(workflow.externalChannelId||'')});
        const files=fileEvidence(workflow,owner.id);
        const raw=await runWorkflowAi(owner.id,workflow,{name:'team-designer'},teamPlanPrompt({...workflow,uploadedFiles:files}));
        const plan=parseTeamPlan(raw);const id=crypto.randomUUID();
        drafts.set(id,{plan,workflow,ownerId:owner.id,createdAt:Date.now()});
        sendJson(response,200,{planId:id,...plan,chosenAgents});return;
      }
      if(request.method==='GET'&&url.pathname==='/api/teams'){
        const owner=control.user(request);const owned=[...teams.values()].filter(team=>team.ownerId===owner.id);
        for(const team of owned)if(team.room&&!team.workRoom)await ensureWorkRoom(request,team);
        sendJson(response,200,owned.map(publicTeam));return;
      }
      const removeTeamMatch=request.method==='POST'&&url.pathname.match(/^\/api\/teams\/([a-f0-9-]+)\/remove$/);
      if(removeTeamMatch){
        const team=ownedTeam(request,removeTeamMatch[1]);
        if(removingTeams.has(team.id)||approvalRequests.has(team.id))throw Object.assign(new Error('A decision for this workflow is already being processed. Try again shortly.'),{status:409});
        if(team.order?.reservation)throw Object.assign(new Error('This customer order has reserved capacity. Finish its reply before removing the workflow.'),{status:409});
        removingTeams.add(team.id);
        try{
          if(team.room&&team.startedAt&&!team.completedAt){
            await control.gateway(request,`/chats/${(team.workRoom||team.room).id}/messages`,'POST',{
              requestId:crypto.randomUUID(),body:'WORKFLOW REMOVED by owner in SwitchFlow. Any pending proposal is declined. No further action is approved.',
            });
            if(team.order&&['checking','pending'].includes(team.order.status)){
              await control.gateway(request,`/chats/${team.room.id}/messages`,'POST',{
                requestId:team.order.id,body:`@${team.order.customerName.replace(/[\r\n@]/g,'').slice(0,80)} Your request for ${team.order.quantity} ${team.order.item} was declined because this workflow was removed. No capacity was reserved.`,threadRootId:team.order.messageId,
              });
            }
          }
          for(const runtime of runtimes.filter(item=>item.team?.id===team.id))runtime.stop();
          for(const agent of Object.values(team.agents))if(agent?.id){
            try{await control.gateway(request,`/agents/${agent.id}`,'DELETE');}
            catch(error){if(error.status!==404)throw error;}
          }
          for(let index=runtimes.length-1;index>=0;index--)if(runtimes[index].team?.id===team.id)runtimes.splice(index,1);
          for(const [id,draft] of drafts)if(draft.teamId===team.id)drafts.delete(id);
          scheduledTeams.delete(team.id);teams.delete(team.id);saveTeams();
          sendJson(response,200,{removed:true,teamId:team.id});return;
        }finally{removingTeams.delete(team.id);}
      }
      if(request.method==='GET'&&url.pathname==='/api/inbox'){
        const owner=control.user(request);
        const [page,roomResult]=await Promise.all([control.gateway(request,'/chats'),control.gateway(request,'/rooms')]);
        const rooms=Array.isArray(roomResult)?roomResult:roomResult.rooms||[];
        page.chats=inboxChats(page.chats||[],rooms,[...teams.values()].filter(team=>team.ownerId===owner.id));
        sendJson(response,200,page);return;
      }
      if(request.method==='POST'&&url.pathname==='/api/inbox'){
        const {connectionId,channelId,name}=await readJson(request);
        const externalChannelId=String(channelId??'').trim();
        const label=String(name??'').trim();
        if(!connectionId||!externalChannelId||!label||label.length>100||externalChannelId.length>250){
          throw Object.assign(new Error('Choose an account and enter a channel name and ID.'),{status:400});
        }
        const gateway=(route,method,body)=>control.gateway(request,route,method,body);
        const bridge=await resolveWorkflowConnection(gateway,{connectionId,externalChannelId});
        const existing=await findLinkedRoom(gateway,bridge.id,externalChannelId);
        const room=existing??await gateway('/rooms','POST',{
          name:label,description:'',bridge_id:bridge.id,external_channel_id:externalChannelId,
          read_visibility:'private',write_visibility:'private',
        });
        await control.joinRoom(request,room.id);
        sendJson(response,200,{roomId:room.id});return;
      }
      const inboxJoin=url.pathname.match(/^\/api\/inbox\/([a-f0-9-]+)\/join$/);
      if(inboxJoin&&request.method==='POST'){
        await control.joinRoom(request,inboxJoin[1]);
        sendJson(response,200,{ok:true});return;
      }
      const inboxRoute=url.pathname.match(/^\/api\/inbox\/([a-f0-9-]+)\/messages$/);
      if(inboxRoute&&request.method==='GET'){
        sendJson(response,200,await control.gateway(request,`/chats/${inboxRoute[1]}/messages?limit=200`));return;
      }
      if(inboxRoute&&request.method==='POST'){
        const input=await readJson(request);
        sendJson(response,201,await inboxReply((route,method,body)=>control.gateway(request,route,method,body),inboxRoute[1],input));return;
      }
      const scheduleRoute=url.pathname.match(/^\/api\/teams\/([a-f0-9-]+)\/schedule$/);
      const activityRoute=url.pathname.match(/^\/api\/teams\/([a-f0-9-]+)\/activity$/);
      if(activityRoute&&request.method==='GET'){
        const team=ownedTeam(request,activityRoute[1]);
        if(!team.room)throw Object.assign(new Error('This team has no room yet.'),{status:404});
        const architect=team.roles.find(role=>role.kind==='architect');
        const runtime=runtimes.find(item=>item.team?.id===team.id&&item.role.name===architect.name);
        if(!runtime||!connectedRoles.has(architect.name))throw Object.assign(new Error('Switch agents are offline. Start Switch and try again.'),{status:503});
        const agent=team.agents[architect.key];
        await api.connectToRoom(agent,(team.workRoom||team.room).id,runtime.connectionId);
        const context=await api.readContext(agent,(team.workRoom||team.room).id,runtime.connectionId,50);
        sendJson(response,200,{team:publicTeam(team),messages:prepareRoomEvidence({},context).recent_messages});return;
      }
      if(scheduleRoute&&request.method==='PUT'){
        const team=ownedTeam(request,scheduleRoute[1]);
        const input=await readJson(request);
        const next=scheduleFor({trigger:input.enabled?'Daily':'Manually',scheduleTime:input.time,timeZone:input.timeZone});
        if(next.enabled){const now=localClock(new Date(),next.timeZone);if(now.time>=next.time||team.schedule?.lastRunDate===now.date)next.lastRunDate=now.date;}
        team.schedule=next;
        saveTeams();sendJson(response,200,publicTeam(team));return;
      }
      if (request.method === 'GET' && url.pathname === '/api/connections') {
        const [types, connections] = await Promise.all([
          control.gateway(request, '/collaborations/types'), control.gateway(request, '/collaborations'),
        ]);
        sendJson(response, 200, {types, connections,preferences:chatPreferences.get(control.user(request).id)}); return;
      }
      if (request.method === 'POST' && url.pathname === '/api/connections') {
        const input = await readJson(request);
        const result = await control.gateway(request, '/collaborations', 'POST', input);
        // Return only public status and identifiers, never platform credentials.
        const connection = normalizeConnection(result);
        sendJson(response, 201, {id: connection.id, name: connection.display_name, type: connection.type, webhook_url: connection.webhook_url}); return;
      }
      if (request.method === "GET" && url.pathname === "/api/status") {
        sendJson(response, 200, {
          connected: connectedRoles.size >= roles.length,
          connectedAgents: [...connectedRoles],
          room: state.room,
        });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/events") {
        const owner=control.user(request);
        response.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        response.write(`data: ${JSON.stringify({ type: "status", connected: connectedRoles.size >= roles.length })}\n\n`);
        const client={response,ownerId:owner.id};eventClients.add(client);
        request.on("close", () => eventClients.delete(client));
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/workflows") {
        const input=await readJson(request);const owner=control.user(request);
        let draft=drafts.get(input.planId);
        // A generated plan is in memory, but its created team is persisted.
        // After restarting the desktop app, recover the matching owned team.
        const matchingTeams=!input.teamId&&!draft?[...teams.values()].filter(team=>team.ownerId===owner.id&&team.title===input.name&&team.workflow.goal===input.goal):[];
        const savedTeamId=input.teamId||(matchingTeams.length===1?matchingTeams[0].id:null);
        if(savedTeamId){
          const saved=ownedTeam(request,savedTeamId);
          const resumeKey=`resume:${saved.id}`;
          if(!drafts.has(resumeKey))drafts.set(resumeKey,{ownerId:owner.id,teamId:saved.id,workflow:saved.workflow,plan:{title:saved.title,agents:saved.roles}});
          draft=drafts.get(resumeKey);
        }
        if(!draft||draft.ownerId!==owner.id)throw Object.assign(new Error('Generate and review your agent team first.'),{status:400});
        if(draft.workflow.aiConnectionId)await aiConnections.get(owner.id,draft.workflow.aiConnectionId);
        await resolveWorkflowConnection((route,method,body)=>control.gateway(request,route,method,body),draft.workflow);
        if(draft.busy)throw Object.assign(new Error('This team is already being created.'),{status:409});
        draft.busy=true;
        try {
        const team=draft.teamId?ownedTeam(request,draft.teamId):buildTeam(draft.plan,owner.id,draft.workflow);
        const chosenAgents=team.invitedAgentsAdded?[]:await resolveAgentChoices(route=>control.gateway(request,route),team.workflow.switchAgentIds);
        team.orderMode = team.workflow.customerRequests===true || (team.workflow.customerRequests===undefined && /\b(customer|client)\b.*\border|\border\b.*\b(customer|client)\b/i.test(team.workflow.goal));
        team.schedule ||= scheduleFor(team.workflow);
        if(!draft.teamId){teams.set(team.id,team);draft.teamId=team.id;saveTeams();}
        const workflow=team.workflow;const goal=workflow.goal;
        // A user-owned registration key gives protocol clients the same owner
        // as the person signed in to this app, not the deployment bootstrap.
        let registrationKey;
        if(team.roles.some(role=>!team.agents[role.key]))registrationKey=await control.gateway(request,'/api-keys','POST',{label:`SwitchFlow ${team.id}`});
        try {
          for(const role of team.roles){
            if(team.agents[role.key])continue;
            const registered=await api.register(role,registrationKey.key);
            team.agents[role.key]={id:registered.id,apiKey:registered.api_key,name:role.name,displayName:role.displayName};saveTeams();
          }
        } finally {
          if(registrationKey)await control.gateway(request,`/api-keys/${registrationKey.id}`,'DELETE');
        }
        for(let index=0;index<team.roles.length;index++){
          const target=team.agents[team.roles[index].key];
          const editor=team.agents[team.roles[(index+1)%team.roles.length].key];
          await api.operation(editor,'update_agent_detail',{agent_id:target.id,addressing:team.roles[index].kind==='architect'?'anyone':'owner_and_owner_agents'});
        }
        const room = team.room ?? await prepareWorkflowRoom(
          (route, method, body) => control.gateway(request, route, method, body),
          {...workflow, goal}, Object.values(team.agents).map(agent => agent.id),
        );
        if([...teams.values()].some(other=>other.id!==team.id&&other.room?.id===room.id&&other.startedAt&&!other.completedAt))throw Object.assign(new Error('Another workflow is active in this room. Open Approvals to review or end that run before starting a new team here.'),{status:409});
        team.room={id:room.id,name:room.name};saveTeams();
        await control.joinRoom(request, room.id);
        await ensureWorkRoom(request,team);
        if(chosenAgents.length){
          team.invitedAgents=chosenAgents;saveTeams();
          await control.gateway(request,`/rooms/${room.id}/agents`,'POST',{agent_ids:chosenAgents.map(agent=>agent.id)});
          team.invitedAgentsAdded=true;saveTeams();
        }
        if(!runtimes.some(runtime=>runtime.team?.id===team.id)){
          for(const role of team.roles){const runtime=new AgentRuntime(role,team.agents[role.key],team);runtimes.push(runtime);runtime.start();}
        }
        for(let attempt=0;attempt<40&&!team.roles.every(role=>connectedRoles.has(role.name));attempt++)await new Promise(resolve=>setTimeout(resolve,250));
        if(!team.roles.every(role=>connectedRoles.has(role.name)))throw new Error('The team was created, but its connections are still starting. Retry to reconnect the same team.');
        for(const runtime of runtimes.filter(item=>item.team?.id===team.id))await api.connectToRoom(runtime.agent,(team.workRoom||room).id,runtime.connectionId);
        const runId=team.id;
        const intake = [
          `@${team.agents.architect.name} BUSINESS REQUEST (${runId})`,
          `A human owner submitted this request from the SwitchFlow desktop application.`,
          `Business: ${String(workflow.business ?? config.business).slice(0, 100)}`,
          `Goal: ${goal}`,
          `Success measure: ${String(workflow.metric ?? config.successMetric).slice(0, 1_000)}`,
          `Trigger: ${String(workflow.trigger ?? "Manual").slice(0, 200)}`,
          `Control: ${String(workflow.permission ?? "Ask before acting").slice(0, 100)}`,
          `Requested chat integrations: ${Array.isArray(workflow.channels) ? workflow.channels.map(String).join(", ").slice(0, 300) : "Mattermost"}. Include these in the workflow plan; do not claim they are connected without evidence. Runs currently use this configured demo room.`,
          `Available data: ${Array.isArray(workflow.data) ? workflow.data.map(String).join(", ").slice(0, 1_000) : "None supplied"}`,
          `Uploaded business file evidence (current versions, limited preview): ${evidenceText(workflow,owner.id)}`,
          `Treat this as the owner's request and follow your team's handoffs.`,
        ].join("\n");
        // The Analyst acts as the desktop app intake relay. The Architect receives
        // this through Switch's normal mention routing, not an internal call.
        if(!team.startedAt&&!team.orderMode)await control.gateway(request, `/chats/${(team.workRoom||team.room).id}/messages`, 'POST', {
          requestId: team.id, body: intake, mentionAgentId: team.agents.architect.id,
        });
        if(!team.startedAt&&team.schedule?.enabled)team.schedule.lastRunDate=localClock(new Date(),team.schedule.timeZone).date;
        team.startedAt ||= new Date().toISOString();saveTeams();
        sendJson(response, 202, { accepted: true, runId, room:team.room,team:publicTeam(team) });
        }finally{draft.busy=false;}
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/approvals") {
        const input = await readJson(request);
        const team=ownedTeam(request,input.teamId);
        if(approvalRequests.has(team.id))throw Object.assign(new Error('Your decision is already being processed. Please wait.'),{status:409});
        approvalRequests.add(team.id);
        try {
        if(!team.room)throw new Error('This team has no room yet.');
        if(team.approvalPending===false)throw Object.assign(new Error('There is no approval waiting for this team.'),{status:409});
        if(team.order){
          if(!team.order.capacity)throw Object.assign(new Error('The order has no capacity assessment yet.'),{status:409});
          const currentCapacity=capacityFromFiles(businessData,team,team.order);
          if(input.decision!=='reject'&&!team.order.reservation&&(currentCapacity.status!=='feasible'||team.order.agentAssessment?.status==='unfeasible'))throw Object.assign(new Error('The selected CSV does not confirm capacity for this order.'),{status:409});
          const accepted=input.decision!=='reject';
          if(accepted&&!team.order.reservation){
            businessData.updateCell(currentCapacity.fileId,team.ownerId,{version:currentCapacity.version,row:currentCapacity.row,column:currentCapacity.column,value:String(currentCapacity.committed+team.order.quantity)});
            team.order.reservation={fileId:currentCapacity.fileId,quantity:team.order.quantity};saveTeams();
          }
          if(!accepted&&team.order.reservation)throw Object.assign(new Error('This order already has reserved capacity; retry acceptance.'),{status:409});
          const customer=team.order.customerName.replace(/[\r\n@]/g,'').slice(0,80);
          const previous=team.order.previousQuantity||0;
          const total=accepted?previous+team.order.quantity:previous;
          const reply=`@${customer} ${accepted?`Your ${team.order.quantity} ${team.order.item} are confirmed. You now have ${total} ${team.order.item} in total.`:`Your request for ${team.order.quantity} ${team.order.item} was declined. Your confirmed total is ${total}.`}`;
          await control.gateway(request, `/chats/${team.room.id}/messages`, 'POST', {requestId:team.order.id,body:reply,threadRootId:team.order.messageId});
          team.order.status=accepted?'accepted':'declined';team.order.decisionAt=new Date().toISOString();team.order.reply=reply;
          if(accepted){team.customerTotals||={};team.customerTotals[team.order.customerId]=total;}
          team.pendingAdditional=null;
          team.completedAt=new Date().toISOString();team.approvalPending=false;saveTeams();
          sendJson(response,200,{decision:team.order.status,room:team.room,customerReply:reply});return;
        }
        const decision = input.decision === 'reject' ? 'REJECT' : config.approvalPhrase;
        let appliedFileChange=null;
        if(decision!=="REJECT"&&team.pendingFileEdit&&!team.pendingFileEdit.applied){
          if(team.workflow.permission==='recommend')throw Object.assign(new Error('This workflow can recommend actions but cannot edit files.'),{status:409});
          const proposal=team.pendingFileEdit;
          const current=businessData.previewCellChange(proposal.fileId,team.ownerId,{expectedVersion:proposal.expectedVersion,row:proposal.row,column:proposal.column,value:proposal.value});
          if(current.before!==proposal.before)throw Object.assign(new Error('The file has changed since the proposal. Generate a new approval packet.'),{status:409});
          await control.gateway(request, `/chats/${(team.workRoom||team.room).id}/messages`, 'POST', {
            requestId:crypto.randomUUID(),body:`FILE UPDATE APPROVED by owner. Proposal ${proposal.id}: ${proposal.fileName}, row ${proposal.row}, ${proposal.columnName}: ${JSON.stringify(proposal.before)} → ${JSON.stringify(proposal.value)}. Reason: ${proposal.reason}`,
          });
          const result=businessData.updateCell(proposal.fileId,team.ownerId,{version:proposal.expectedVersion,row:proposal.row,column:proposal.column,value:proposal.value});
          appliedFileChange={fileName:proposal.fileName,...result.change,version:result.file.version};
          proposal.applied=true;proposal.appliedFileChange=appliedFileChange;saveTeams();
        }
        if(decision!=="REJECT"&&team.pendingFileEdit?.applied&&!team.pendingFileEdit.recordPosted){
          const proposal=team.pendingFileEdit;
          await control.gateway(request, `/chats/${(team.workRoom||team.room).id}/messages`, 'POST', {
            requestId:crypto.randomUUID(),body:`FILE UPDATE EXECUTED in SwitchFlow. Proposal ${proposal.id}: ${proposal.fileName} version ${proposal.appliedFileChange.version}; row ${proposal.row}, ${proposal.columnName} is now ${JSON.stringify(proposal.value)}. Previous version retained locally.`,
          });
          proposal.recordPosted=true;saveTeams();
        }
        team.approvalDispatchPending=decision!=="REJECT";saveTeams();
        try{
          await control.gateway(request, `/chats/${(team.workRoom||team.room).id}/messages`, 'POST', {
            requestId: crypto.randomUUID(), body: decision, mentionAgentId: team.agents.analyst.id,
          });
        }catch(error){team.approvalDispatchPending=false;saveTeams();throw error;}
        team.approvalPending=false;saveTeams();
        sendJson(response, 200, {decision, room:team.room,appliedFileChange:appliedFileChange||team.pendingFileEdit?.appliedFileChange||null});
        return;
        } finally { approvalRequests.delete(team.id); }
      }
      const endRunMatch = request.method === "POST" && url.pathname.match(/^\/api\/teams\/([^/]+)\/end-run$/);
      if (endRunMatch) {
        const team=ownedTeam(request,decodeURIComponent(endRunMatch[1]));
        if(!team.room||!team.startedAt||team.completedAt)throw Object.assign(new Error('This team has no active run to end.'),{status:409});
        if(team.orderMode&&['checking','pending'].includes(team.order?.status))throw Object.assign(new Error('This customer request must be decided in Approvals before ending the team.'),{status:409});
        await control.gateway(request, `/chats/${(team.workRoom||team.room).id}/messages`, 'POST', {
          requestId:crypto.randomUUID(),body:`RUN ENDED by owner in SwitchFlow. No further action is approved for this run.`,
        });
        team.completedAt=new Date().toISOString();team.approvalPending=false;team.pendingFileEdit=null;saveTeams();
        sendJson(response,200,{ended:true,team:publicTeam(team)});
        return;
      }
      if (request.method === "GET") {
        serveWebsite(request, response);
        return;
      }
      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      sendJson(response, error.status || 500, { error: error.message });
    }
  });
  server.listen(config.webPort, "127.0.0.1", () => {
    console.log(`SwitchFlow website connected at http://127.0.0.1:${config.webPort}`);
  });
  return server;
}

function isAllowedHandoff(roleKey, message, approvalEvent) {
  const sender = message.senderName;
  if (roleKey === "architect") {
    return !agentNameSet.has(sender)
      || sender === state.agents.analyst.name
      || sender === state.agents.verifier.name;
  }
  if (roleKey === "analyst") {
    return approvalEvent || sender === state.agents.architect.name;
  }
  if (roleKey === "operator") return sender === state.agents.analyst.name;
  if (roleKey === "verifier") return sender === state.agents.operator.name;
  return false;
}

async function runScheduledTeam(team) {
  if(scheduledTeams.has(team.id)||!team.room||!team.startedAt||!scheduleIsDue(team.schedule))return;
  if(!team.completedAt)return; // A run waiting for analysis or approval remains in control.
  if([...teams.values()].some(other=>other.id!==team.id&&other.room?.id===team.room.id&&other.startedAt&&!other.completedAt))return;
  const verifier=team.roles.find(role=>role.kind==='verifier');
  const architect=team.roles.find(role=>role.kind==='architect');
  const runtime=runtimes.find(item=>item.team?.id===team.id&&item.role.name===verifier.name);
  if(!runtime||!connectedRoles.has(verifier.name)||!connectedRoles.has(architect.name))return;
  scheduledTeams.add(team.id);
  try {
    const runId=crypto.randomUUID();
    const body=`@${architect.name} SCHEDULED RUN START (${runId})\nBusiness: ${team.workflow.business}. Goal: ${team.workflow.goal}. Success: ${team.workflow.metric}.\nCurrent uploaded business files: ${evidenceText(team.workflow,team.ownerId)}\nThis starts a fresh run. Analyze only current file versions. Request a new human approval before any action.`;
    team.completedAt=null;team.pendingFileEdit=null;team.approvalPending=false;team.approvalRecorded=false;team.approvalDispatchPending=false;team.currentRunId=runId;team.runNumber=(team.runNumber||1)+1;saveTeams();
    await api.postMessage(team.agents[verifier.key],(team.workRoom||team.room).id,body,runtime.connectionId);
    team.schedule.lastRunDate=localClock(new Date(),team.schedule.timeZone).date;
    team.schedule.lastError=null;saveTeams();
    broadcast({type:'scheduled_run',teamId:team.id,ownerId:team.ownerId,runId});
  } catch(error) {
    team.completedAt ||= new Date().toISOString();
    team.schedule.lastError=error.message.slice(0,300);saveTeams();
    console.error(`[schedule ${team.id}] ${error.message}`);
  } finally {scheduledTeams.delete(team.id);}
}

class AgentRuntime {
  constructor(role, agent, team=null) {
    this.role = role;
    this.agent = agent;
    this.team=team;
    this.connectionId = crypto.randomUUID();
    this.cursor = "head";
    this.queue = Promise.resolve();
    this.fileQueue = Promise.resolve();
    this.stopping = false;
  }

  start() {
    console.log(`[${this.role.key}] connecting as @${this.agent.name}`);
    this.socket = api.openSocket(this.agent, {
      connectionId: this.connectionId,
      cursor: this.cursor,
      onFrame: (frame, socket) => this.onFrame(frame, socket),
      onClose: (code, reason) => this.onClose(code, reason),
      onError: (error) => console.error(`[${this.role.key}] socket error: ${error.message}`),
    });
  }

  onFrame(frame, socket) {
    if (frame.event === "ping") {
      socket.send(JSON.stringify({ type: "pong", cursor: Number(this.cursor) || 0 }));
      return;
    }
    if (frame.event === "connection_state") {
      connectedRoles.add(this.role.name);
      console.log(`[${this.role.key}] connected`);
      broadcast({ type: "status", connected: connectedRoles.size >= roles.length });
      if(this.team?.room && this.role.kind==='analyst' && this.team.approvalPending===false && !this.team.completedAt){
        this.queue=this.queue.then(async()=>{
          await api.connectToRoom(this.agent,(this.team.workRoom||this.team.room).id,this.connectionId);
          const context=await api.readContext(this.agent,(this.team.workRoom||this.team.room).id,this.connectionId,50);
          const messages=(context.threads||[]).flatMap(t=>[t.root,...(t.replies||[])]).filter(Boolean);
          const names=[...agentNameSet,...this.team.roles.map(r=>r.name),...(this.team.invitedAgents||[]).map(agent=>agent.name)];
          const packet=messages.findLastIndex(m=>m.sender_name===this.agent.name&&/APPROVAL REQUIRED/.test(m.body||''));
          const approval=messages.slice(packet+1).findLast(m=>isHumanApproval({body:m.body||'',senderName:m.sender_name},config.approvalPhrase,names));
          const operator=this.team.roles.find(r=>r.kind==='operator');
          if(packet>=0&&approval&&!messages.slice(packet+1).some(m=>m.sender_name===operator.name||m.sender_name===this.agent.name)){
            const key=`${this.agent.id}:${approval.id}`;
            if(!seenMessages.has(key)){seenMessages.add(key);await this.respond({roomId:(this.team.workRoom||this.team.room).id,messageId:approval.id,body:approval.body,senderName:approval.sender_name,senderId:approval.sender,addressed:true,attachments:[]},true);}
          }
        }).catch(error=>console.error(`[approval recovery] ${error.message}`));
      }
      if(this.team?.room && this.role.kind==='architect'){
        this.fileQueue=this.fileQueue.then(async()=>{
          await api.connectToRoom(this.agent,this.team.room.id,this.connectionId);
          const context=await api.readContext(this.agent,this.team.room.id,this.connectionId,50);
          for(const item of contextFileMessages(context))await this.importFiles(item);
        }).catch(error=>console.error(`[chat files] catch-up failed: ${error.message}`));
      }
      return;
    }
    if (typeof frame.id === "number") this.cursor = frame.id;
    const message = messageFromFrame(frame);
    if (!message || !message.roomId || !message.messageId) return;
    const workRoomId=this.team?.workRoom?.id||this.team?.room?.id;
    const customerMessage=this.team?.workRoom&&message.roomId===this.team.room.id;
    if (message.roomId !== (workRoomId ?? state.room.id)&&!(customerMessage&&this.role.kind==='architect')) return;
    if(this.team?.invitedAgents?.some(agent=>agent.name===message.senderName))return;
    if(this.team&&this.role.kind==='architect'&&message.attachments.length){
      this.fileQueue=this.fileQueue.then(()=>this.importFiles(message))
        .catch(error=>console.error(`[chat files] import failed: ${error.message}`));
    }
    // A real customer order in the linked chat must not depend on the form's
    // optional "customer mode" selection. That setting controls the initial
    // desktop kickoff, while this recognises a customer message already in the
    // workflow room (including existing teams created before that setting).
    if(this.team&&this.role.kind==='architect'&&(!this.team.workRoom||customerMessage)&&message.senderId!==`@switch-member-${this.team.ownerId}:localhost`&&this.team.roles.every(role=>role.name!==message.senderName)){
      const confirmation=this.team.pendingAdditional;
      if(confirmation&&message.senderId===confirmation.customerId&&/^(yes|no)\s*[.!]?$/i.test(message.body.trim())){
        this.team.pendingAdditional=null;
        if(/^no/i.test(message.body.trim())){
          saveTeams();
          this.fileQueue=this.fileQueue.then(()=>api.postMessage(this.agent,message.roomId,'Okay. No extra cookies were added to your request.',this.connectionId,message.threadId||confirmation.messageId)).catch(error=>console.error(`[customer confirmation] ${error.message}`));
          return;
        }
        const pending=this.team.order;
        if(pending&&['checking','pending'].includes(pending.status)&&pending.customerId===confirmation.customerId){
          pending.quantity+=confirmation.quantity;
          pending.request+=`\nCustomer confirmed another ${confirmation.quantity} ${confirmation.item}.`;
          pending.status='checking';pending.agentAssessment=null;
          pending.capacity=capacityFromFiles(businessData,this.team,pending);
          this.team.approvalPending=true;
        }else{
          const incoming=confirmation.order;
          incoming.previousQuantity=this.team.customerTotals?.[incoming.customerId]||0;
          incoming.capacity=capacityFromFiles(businessData,this.team,incoming);
          this.team.order=incoming;
        }
        this.team.completedAt=null;saveTeams();
        broadcast({type:'order',teamId:this.team.id,ownerId:this.team.ownerId,order:this.team.order});
        message.body=`Customer confirmed another ${confirmation.quantity} ${confirmation.item}. Review the updated request for ${this.team.order.quantity} ${this.team.order.item}.`;
        message.addressed=true;
        this.fileQueue=this.fileQueue.then(()=>api.postMessage(this.agent,message.roomId,`Thanks. Your request is now ${this.team.order.quantity} ${this.team.order.item}${this.team.order.previousQuantity?` (bringing your total to ${this.team.order.previousQuantity+this.team.order.quantity})`:''}. The owner will review it before any reservation.`,this.connectionId,message.threadId||confirmation.messageId)).catch(error=>console.error(`[customer confirmation] ${error.message}`));
      }
      const incoming=orderRequest(message);
      if(incoming){
        const receiptKey=`customer:${this.team.id}:${message.messageId}`;
        if(seenMessages.has(receiptKey))return;
        seenMessages.add(receiptKey);
        message.addressed=true;
        if(this.team.order?.messageId===message.messageId)return;
        if(this.team.order?.status==='checking'||this.team.order?.status==='pending'){
          const sameCustomer=this.team.order.customerId===incoming.customerId&&this.team.order.item.toLowerCase()===incoming.item.toLowerCase();
          if(sameCustomer)this.team.pendingAdditional={customerId:incoming.customerId,quantity:incoming.quantity,item:incoming.item,messageId:incoming.messageId};
          if(sameCustomer)saveTeams();
          const reply=sameCustomer?`You already have ${this.team.order.quantity} ${this.team.order.item} awaiting review. Do you want another ${incoming.quantity} ${incoming.item}, bringing this request to ${this.team.order.quantity+incoming.quantity}? Reply YES or NO.`:'Another request is awaiting review. Your new request has not been accepted or reserved. Please send it again after the current decision.';
          this.fileQueue=this.fileQueue.then(()=>api.postMessage(this.agent,message.roomId,reply,this.connectionId,message.threadId||message.messageId)).catch(error=>console.error(`[customer receipt] ${error.message}`));
          return;
        }
        if(this.team.customerTotals?.[incoming.customerId]&&this.team.order?.item.toLowerCase()===incoming.item.toLowerCase()){
          this.team.pendingAdditional={customerId:incoming.customerId,quantity:incoming.quantity,item:incoming.item,messageId:incoming.messageId,order:incoming};saveTeams();
          this.fileQueue=this.fileQueue.then(()=>api.postMessage(this.agent,message.roomId,`You already have ${this.team.customerTotals[incoming.customerId]} ${incoming.item} confirmed. Do you want another ${incoming.quantity}, bringing your total to ${this.team.customerTotals[incoming.customerId]+incoming.quantity}? Reply YES or NO.`,this.connectionId,message.threadId||message.messageId)).catch(error=>console.error(`[customer receipt] ${error.message}`));
          return;
        }
        incoming.capacity=capacityFromFiles(businessData,this.team,incoming);
        this.team.orderMode=true;this.team.order=incoming;this.team.completedAt=null;this.team.approvalPending=true;saveTeams();
        broadcast({type:'order',teamId:this.team.id,ownerId:this.team.ownerId,order:incoming});
        this.queue=this.queue.then(()=>api.postMessage(this.agent,message.roomId,`Thanks! We received your request for ${incoming.quantity} ${incoming.item}. We'll let you know when the owner decides.`,this.connectionId,message.threadId||message.messageId)).catch(error=>console.error(`[customer receipt] ${error.message}`));
      }
    }
    if(this.team?.completedAt)return;

    if (!broadcastedMessageIds.has(message.messageId)) {
      broadcastedMessageIds.add(message.messageId);
      const senderRole=this.team?.roles.find(role=>role.name===message.senderName);
      let proposalError=null;
      if(this.team&&senderRole?.kind==='analyst'&&!this.team.approvalRecorded&&/APPROVAL REQUIRED/i.test(message.body)){
        if(this.team.order?.status==='checking'){
          try{this.team.order.agentAssessment=capacityProposal(message.body,this.team.order);
            if(this.team.order.agentAssessment)this.team.order.status='pending';
            else proposalError='The analyst did not provide a structured order capacity assessment.';
          }catch(error){proposalError=error.message;}
        }
        this.team.approvalPending=!this.team.order||['checking','pending'].includes(this.team.order.status);
        try{this.team.pendingFileEdit=extractFileProposal(businessData,this.team,message.body);saveTeams();}
        catch(error){this.team.pendingFileEdit=null;proposalError=error.message;saveTeams();}
      }
      broadcast({
        type: "room_message",
        teamId:this.team?.id,ownerId:this.team?.ownerId,kind:senderRole?.kind,
        fileProposal:this.team?.pendingFileEdit||null,proposalError,
        order:this.team?.order||null,
        id: message.messageId,
        sender: message.senderName,
        body: message.body,
        humanApproval: isHumanApproval(message, config.approvalPhrase,
          [...agentNameSet, ...(this.team?.roles.map(role=>role.name) || [])])&&(!this.team||(!this.team.approvalRecorded&&(this.team.approvalPending||this.team.approvalDispatchPending))),
        at: new Date().toISOString(),
      });
    }

    const approvalEvent = (this.role.kind||this.role.key) === 'analyst' && isHumanApproval(message, config.approvalPhrase,
      [...agentNameSet, ...(this.team?.roles.map(role=>role.name) || [])]) && (!this.team||(!this.team.approvalRecorded&&(this.team.approvalPending||this.team.approvalDispatchPending)));
    if(this.team&&approvalEvent){this.team.approvalRecorded=true;this.team.approvalDispatchPending=false;this.team.approvalPending=false;saveTeams();}
    if(this.team&&this.role.kind==='analyst'&&message.body.trim().toUpperCase()==='REJECT'
      && message.senderType!=='agent'&&!this.team.roles.some(role=>role.name===message.senderName)){
      this.team.completedAt=new Date().toISOString();this.team.approvalPending=false;saveTeams();return;
    }
    if (!message.addressed && !approvalEvent) return;
    if (message.senderName === this.agent.name) return;
    if (!(this.team?acceptsHandoff(this.role,this.team,message,approvalEvent):isAllowedHandoff(this.role.key, message, approvalEvent))) {
      console.log(`[${this.role.key}] ignored out-of-order message from ${message.senderName}`);
      return;
    }
    const key = `${this.agent.id}:${message.messageId}`;
    if (seenMessages.has(key)) return;
    seenMessages.add(key);

    this.queue = this.queue
      .then(() => this.respond(message, approvalEvent))
      .catch((error) => console.error(`[${this.role.key}] turn failed: ${error.message}`));
  }

  importFiles(message){
    return importChatFiles({message,team:this.team,agent:this.agent,api,businessData,saveTeams,broadcast});
  }

  async respond(message, approvalEvent) {
    console.log(`[${this.role.key}] received from ${message.senderName}: ${message.body.slice(0, 100)}`);
    const targetRoomId=this.team?.workRoom?.id||message.roomId;
    const roomContext = await api.connectToRoom(
      this.agent,
      targetRoomId,
      this.connectionId,
    );
    const conversation = await api.readContext(
      this.agent,
      targetRoomId,
      this.connectionId,
      50,
    );
    const evidence = prepareRoomEvidence(roomContext, conversation, this.team?.currentRunId||null);
    let prompt = buildPrompt(this.role, message, evidence, approvalEvent);
    if(this.team?.order?.status==='checking')prompt+=`\nCURRENT CUSTOMER ORDER (trusted SwitchFlow metadata): ${JSON.stringify(this.team.order)}\nCheck capacity using actual uploaded file evidence: stock, recipe, staff, equipment and other commitments. Never invent capacity. If any necessary evidence is missing, use unknown. Analyst: include exactly one line ORDER_CAPACITY: {"orderId":"${this.team.order.id}","status":"feasible|unfeasible|unknown","evidence":"specific checked facts","limitation":"missing facts"} with ONE status value, followed by APPROVAL REQUIRED. Then ask the owner directly: "Do you want to accept or decline this customer order? Decide in SwitchFlow Approvals." If capacity is unknown, explain what the owner must verify before accepting. Do not ask the owner to approve a hold or a planning packet instead of deciding this order. Only the owner decides; do not send an acceptance to the customer yourself.`;
    const answer = await runWorkflowAi(this.team?.ownerId,this.team?.workflow,this.role,prompt);
    if(this.team?.completedAt)return;
    const postedAnswer=this.team?.order&&this.role.kind==='analyst'&&['checking','pending'].includes(this.team.order.status)
      ?orderApprovalMessage(answer,this.team.order):answer;
    await api.postMessage(
      this.agent,
      targetRoomId,
      postedAnswer,
      this.connectionId,
      targetRoomId===message.roomId?message.threadId:null,
    );
    if(this.team&&this.role.kind==='architect'&&this.team.roles.find(role=>role.kind==='verifier')?.name===message.senderName&&!message.body.includes('SCHEDULED RUN START')&&!this.team.approvalPending&&!['checking','pending'].includes(this.team.order?.status)){this.team.completedAt=new Date().toISOString();saveTeams();}
    if(this.team&&this.role.kind==='analyst'&&this.team.workflow.permission==='recommend'&&!this.team.approvalPending&&!['checking','pending'].includes(this.team.order?.status)){this.team.completedAt=new Date().toISOString();saveTeams();}
    console.log(`[${this.role.key}] posted response`);
  }

  onClose(code, reason) {
    connectedRoles.delete(this.role.name);
    broadcast({ type: "status", connected: false });
    if (this.stopping) return;
    console.error(`[${this.role.key}] disconnected (${code} ${reason?.toString() || ""}); reconnecting in 2s`);
    setTimeout(() => this.start(), 2_000);
  }

  stop() {
    this.stopping = true;
    this.socket?.close(1000, "SwitchFlow stopping");
  }
}

async function main() {
  runtimes.push(...roles.filter(role=>state.agents[role.key]).map((role) => {
    const agent = state.agents[role.key];
    if (!agent) throw new Error(`Missing ${role.key} agent in state.json`);
    return new AgentRuntime(role, agent);
  }));
  for(const team of teams.values())if(team.room)for(const role of team.roles)runtimes.push(new AgentRuntime(role,team.agents[role.key],team));
  runtimes.forEach((runtime) => runtime.start());
  const webServer = startWebServer();
  const scheduleTimer=setInterval(()=>{for(const team of teams.values())runScheduledTeam(team).catch(error=>console.error(error));},30_000);
  scheduleTimer.unref();
  const sessionTimer=setInterval(()=>control.refreshSessions().catch(()=>{}),60*60*1000);
  sessionTimer.unref();
  console.log(`SwitchFlow is listening in room ${state.room.name}. Press Ctrl+C to stop.`);

  const shutdown = () => {
    console.log("Stopping SwitchFlow agents...");
    runtimes.forEach((runtime) => runtime.stop());
    clearInterval(scheduleTimer);
    clearInterval(sessionTimer);
    webServer.close();
    setTimeout(() => process.exit(0), 250);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(`Bridge failed: ${error.message}`);
  process.exitCode = 1;
});

