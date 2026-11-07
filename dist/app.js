const businessProfiles = {
  restaurant: {
    label: "Restaurant",
    name: "Tomorrow's demand and ordering",
    metric: "Less waste and fewer stock-outs",
    agents: [
      ["IN", "Intake Agent", "Structures the goal, timing, and available data."],
      ["DM", "Demand Agent", "Forecasts tomorrow's covers and menu demand."],
      ["WT", "Waste Agent", "Finds ingredients at risk of expiry or overstock."],
      ["PR", "Procurement Agent", "Prepares a quantity and supplier plan."],
      ["OK", "Manager approval", "Checks cost, quantities, and exceptions.", "approval"],
      ["EX", "Execution Agent", "Creates the approved ingredient order.", "output"],
      ["VR", "Verification Agent", "Tracks waste, availability, and forecast accuracy.", "output"]
    ]
  },
  developer: {
    label: "Software team",
    name: "Production bug triage",
    metric: "Every incident has a reproduced cause or an explicit evidence gap",
    agents: [
      ["IN", "Incident Intake Agent", "Summarizes the report, severity, and affected users."],
      ["RP", "Reproduction Agent", "Checks supplied logs and writes repeatable reproduction steps."],
      ["OK", "Developer approval", "Reviews the proposed fix and release risk.", "approval"],
      ["FX", "Fix Planning Agent", "Prepares an approved fix plan without changing a repository.", "output"],
      ["VR", "Verification Agent", "Checks the report against the supplied evidence.", "output"]
    ]
  },
  retail: {
    label: "Retail",
    name: "Inventory and replenishment",
    metric: "Fewer stock-outs and lower dead stock",
    agents: [
      ["IN", "Intake Agent", "Structures the inventory goal and available data."],
      ["DF", "Demand Agent", "Forecasts demand by item and selling period."],
      ["ST", "Stock Agent", "Finds shortages, excess stock, and slow movers."],
      ["SP", "Supplier Agent", "Compares prices, lead times, and minimum orders."],
      ["OK", "Owner approval", "Reviews spend and replenishment quantities.", "approval"],
      ["PO", "Execution Agent", "Creates approved purchase orders.", "output"],
      ["VR", "Verification Agent", "Compares predicted and actual sales.", "output"]
    ]
  },
  freelancer: {
    label: "Freelancer",
    name: "Scope and payment protection",
    metric: "Fewer unpaid changes and faster collection",
    agents: [
      ["IN", "Intake Agent", "Reads the brief, messages, and agreed terms."],
      ["SC", "Scope Agent", "Separates agreed work from new requests."],
      ["PC", "Pricing Agent", "Estimates effort and milestone impact."],
      ["CT", "Contract Agent", "Drafts a clear change order."],
      ["OK", "Freelancer approval", "Reviews the scope, price, and client message.", "approval"],
      ["IV", "Invoice Agent", "Creates the approved milestone invoice.", "output"],
      ["VR", "Verification Agent", "Tracks acceptance and payment status.", "output"]
    ]
  },
  clinic: {
    label: "Clinic",
    name: "Follow-up and expiry control",
    metric: "More completed follow-ups and less expired stock",
    agents: [
      ["IN", "Intake Agent", "Structures follow-up and stock requirements."],
      ["FU", "Follow-up Agent", "Finds patients due for a check-in or refill."],
      ["ME", "Medicine Agent", "Flags low and near-expiry stock."],
      ["RS", "Risk Agent", "Escalates sensitive or high-priority cases."],
      ["OK", "Staff approval", "Reviews sensitive messages and inventory actions.", "approval"],
      ["EX", "Execution Agent", "Sends approved reminders and creates tasks.", "output"],
      ["VR", "Verification Agent", "Records responses and stock outcomes.", "output"]
    ]
  },
  construction: {
    label: "Construction",
    name: "Daily site control",
    metric: "Earlier delay detection and tighter budget control",
    agents: [
      ["IN", "Intake Agent", "Collects photos, attendance, purchases, and plan data."],
      ["PG", "Progress Agent", "Compares visible work with planned progress."],
      ["MT", "Material Agent", "Reconciles deliveries, usage, and remaining stock."],
      ["BG", "Budget Agent", "Finds overruns and unusual expenses."],
      ["OK", "Project manager approval", "Reviews corrective actions.", "approval"],
      ["RP", "Execution Agent", "Produces the daily report and task list.", "output"],
      ["VR", "Verification Agent", "Checks whether actions were completed.", "output"]
    ]
  },
  creator: {
    label: "Creator",
    name: "Brand campaign delivery",
    metric: "Faster planning and clearer campaign value",
    agents: [
      ["IN", "Intake Agent", "Structures the brand brief and constraints."],
      ["AU", "Audience Agent", "Analyzes audience fit and previous performance."],
      ["CN", "Content Agent", "Builds concepts, scripts, and a publishing plan."],
      ["PC", "Pricing Agent", "Recommends rates and usage terms."],
      ["OK", "Creator approval", "Approves scope, price, and content direction.", "approval"],
      ["PB", "Execution Agent", "Prepares approved campaign assets.", "output"],
      ["VR", "Performance Agent", "Reports campaign reach and engagement.", "output"]
    ]
  },
  transport: {
    label: "Transport",
    name: "Profitable return load",
    metric: "Fewer empty kilometres and stronger trip margin",
    agents: [
      ["IN", "Intake Agent", "Reads vehicle, route, capacity, and timing."],
      ["LM", "Load Match Agent", "Finds compatible return loads."],
      ["RT", "Route Agent", "Calculates distance, tolls, and feasible detours."],
      ["PF", "Profit Agent", "Estimates fuel cost and net margin."],
      ["OK", "Dispatcher approval", "Reviews customer, route, and price.", "approval"],
      ["TR", "Execution Agent", "Creates the trip sheet and driver instructions.", "output"],
      ["VR", "Verification Agent", "Tracks delivery and settlement.", "output"]
    ]
  },
  other: {
    label: "Custom business",
    name: "Custom operating workflow",
    metric: "Faster completion with visible human control",
    agents: [
      ["IN", "Intake Agent", "Structures the business goal and available context."],
      ["DA", "Data Agent", "Collects and validates the required information."],
      ["AN", "Analysis Agent", "Finds patterns, risks, and opportunities."],
      ["PL", "Planning Agent", "Creates an actionable business plan."],
      ["OK", "Owner approval", "Reviews risk and the proposed action.", "approval"],
      ["EX", "Execution Agent", "Performs the approved action.", "output"],
      ["VR", "Verification Agent", "Confirms the result and captures learning.", "output"]
    ]
  }
};

const templates = [
  { key: "restaurant", business: "Restaurant", name: "Tomorrow's demand", desc: "Review sales and stock, then prepare an ingredient plan for manager approval.", status: "Demo brief", steps: 5, sample: "restaurant-demand-demo.csv" },
  { key: "developer", business: "Software team", name: "Production bug triage", desc: "Turn a bug report and logs into reproduction steps, a fix plan, and a verified incident summary.", status: "Demo brief", steps: 5, sample: "developer-incident-demo.txt" },
  { key: "retail", business: "Retail store", name: "Stock replenishment", desc: "Find shortage and overstock risks, then prepare a purchase proposal for owner approval.", status: "Demo brief", steps: 5, sample: "retail-inventory-demo.csv" }
];

const templateDefaults = {
  restaurant: {
    goal: "Use the selected sales and stock file to estimate tomorrow's menu demand, flag shortage and waste risks, and prepare an ingredient order proposal for manager approval. Show the calculation and missing evidence. Do not claim a real supplier order was placed.",
    metric: "The proposal names the quantities, source rows, assumptions, and shortage or waste risks for each reviewed item.",
    trigger: "Daily", scheduleTime: "18:00", sample: "restaurant-demand-demo.csv"
  },
  developer: {
    goal: "A developer reports that checkout fails after a recent release. Use the selected incident log to classify severity, identify the smallest reproducible case, separate observations from hypotheses, and prepare a fix and rollback plan for developer approval. Do not claim code was changed or deployed.",
    metric: "The incident report includes reproducible steps, cited log evidence, an approved next action, and a verification checklist.",
    trigger: "Manually", sample: "developer-incident-demo.txt"
  },
  retail: {
    goal: "Review the selected inventory and sales file, identify items likely to run out and items with excess stock, calculate a proposed replenishment quantity, and send an owner approval packet. Do not claim a real supplier order was placed.",
    metric: "The proposal includes current stock, recent sales, proposed quantities, and a reason for every item; no supplier order is claimed without an integration.",
    trigger: "Daily", scheduleTime: "17:00", sample: "retail-inventory-demo.csv"
  },
  freelancer: {
    goal: "Detect requests outside the agreed scope, calculate their impact, prepare a change order, and invoice only after my approval.",
    metric: "Capture every approved scope change and reduce overdue invoices."
  }
};

const phases = ["understand", "plan", "review", "approve", "execute", "verify", "improve"];

const appState = {
  workflow: null,
  running: false,
  approvalPending: false,
  order: null,
  approved: false,
  fileProposal:null,
  events: [],
  phase: "understand",
  runId: null
};
let workflowChatConnections=[];
let rememberedChatDestinations={};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function setView(view) {
  const setupBrief = document.body.classList.contains('is-onboarding') && view === 'builder';
  if (setupBrief) view = 'overview';
  if (document.body.classList.contains('is-workspace-active') && ['overview', 'connections', 'data'].includes(view)) view = 'builder';
  const titles = { overview:'Business overview', chats:'Chats',connections: "Connections", data:"Data & schedules", builder: "Build a workflow", room: "Agent room", approvals: "Approval inbox", library: "Workflow library", history: "Run history", help:"Help" };
  const setupView = view === 'connections' || view === 'data';
  const activeView = setupView ? 'overview' : view;
  $$(".view").forEach(el => el.classList.remove("is-visible"));
  $$(".nav-item").forEach(el => el.classList.toggle("is-active", el.dataset.view === activeView));
  $(`#${activeView}View`).classList.add("is-visible");
  $("#viewTitle").textContent = titles[activeView];
  if(view==='room')$('#roomBack').textContent=document.body.classList.contains('is-onboarding')?'← Back to connections':'← Back to workflow';
  if(activeView==='overview')refreshOverviewReadiness();
  if(setupView) requestAnimationFrame(() => $(`#${view}View`)?.scrollIntoView({behavior:'smooth',block:'start'}));
  if(setupBrief) requestAnimationFrame(() => $('#workflowForm').scrollIntoView({behavior:'smooth',block:'start'}));
  if(view==='chats'&&typeof refreshInbox==='function')refreshInbox();
  if(view==='approvals')refreshActiveWorkflowList().catch(error=>showToast(error.message));
  if(view==='approvals'){
    controlRequest('/api/teams').then(teams=>{
      const pending=teams.filter(team=>team.approvalPending);
      const selected=pending.find(team=>team.id===appState.teamId);
      const active=selected||pending[0];
      if(active){
        appState.teamId=active.id;appState.runId=active.id;
        appState.workflow={label:active.workflow.business||'Business',name:active.title,goal:active.workflow.goal,metric:active.workflow.metric,trigger:active.workflow.trigger,data:active.files||[],agents:active.agents||[],permission:active.workflow.permission};
        appState.fileProposal=active.fileProposal||null;appState.order=active.order||null;appState.approvalPending=true;
        renderApproval();return;
      }
      appState.approvalPending=false;
      const list=$('#approvalList');list.replaceChildren();
      renderApproval();
    }).catch(error=>showToast(error.message));
  }
}

async function refreshActiveWorkflowList(){
  const list=$('#activeWorkflowList');
  const teams=await controlRequest('/api/teams');
  const active=teams.filter(team=>team.room&&team.startedAt&&!team.completedAt);
  list.replaceChildren();
  if(!active.length)return;
  const heading=document.createElement('h3');heading.textContent='Active runs';list.append(heading);
  for(const team of active){
    const card=document.createElement('article');card.className='approval-card';
    const info=document.createElement('div');
    const title=document.createElement('h3');title.textContent=team.title;
    const detail=document.createElement('p');detail.textContent=`Room: ${team.room.name}. ${team.files?.length?`${team.files.length} selected business file(s).`:'No business file was selected for this run.'} ${team.approvalPending?'A decision is waiting.':team.orderMode&&['checking','pending'].includes(team.order?.status)?'A customer request is still being checked.':'This run is still using the room.'}`;
    info.append(title,detail);card.append(info);
    const actions=document.createElement('div');actions.className='approval-actions';
    const button=document.createElement('button');button.type='button';button.className='button ghost';
    button.textContent=team.approvalPending?'Review approval':'End run';
    if(team.orderMode&&['checking','pending'].includes(team.order?.status))button.disabled=true;
    button.addEventListener('click',async()=>{
      if(team.approvalPending){openTeamApproval(team);return;}
      button.disabled=true;
      try{
        await controlRequest(`/api/teams/${encodeURIComponent(team.id)}/end-run`,'POST',{});
        if(appState.teamId===team.id){appState.running=false;appState.approvalPending=false;renderApproval();$('#runStateText').textContent='Ended by owner';}
        showToast(`Ended ${team.title}. You can now use ${team.room.name} for another workflow.`);
        await refreshActiveWorkflowList();
      }catch(error){button.disabled=false;showToast(error.message);}
    });
    const remove=document.createElement('button');remove.type='button';remove.className='button ghost';remove.textContent='Remove workflow';
    remove.addEventListener('click',()=>removeCreatedWorkflow(team));
    actions.append(button,remove);card.append(actions);list.append(card);
  }
}

async function removeCreatedWorkflow(team){
  const customerNote=team.orderMode&&team.order&&['checking','pending'].includes(team.order.status)?' The pending customer request will be declined in its chat.':'';
  if(!window.confirm(`Remove "${team.title}"? Its generated agents and schedule will be removed.${customerNote} Switch room history and uploaded files will remain.`))return;
  try{
    await controlRequest(`/api/teams/${encodeURIComponent(team.id)}/remove`,'POST',{});
    if(appState.teamId===team.id){appState.teamId=null;appState.runId=null;appState.running=false;appState.approvalPending=false;appState.order=null;appState.fileProposal=null;renderApproval();}
    showToast(`Removed ${team.title}. Its chat room is available for a new workflow.`);
    await refreshActiveWorkflowList();
    if(typeof refreshConnections==='function')await refreshConnections();
  }catch(error){showToast(error.message);}
}

function refreshOverviewReadiness() {
  const signedIn = $("#switchLoginForm").hidden;
  const activeConnections = workflowChatConnections.filter(item => !['inactive','disconnected'].includes(String(item.status || '').toLowerCase()));
  const files = $$('#businessFiles input[name="fileIds"]');
  const readiness = $('#workspaceReadiness');
  const flip = $('#workspaceSwitch');
  const label = $('#switchLabel');
  const help = $('#switchHelp');
  if (!readiness || !flip || !label || !help) return;

  const ready = signedIn && activeConnections.length > 0 && files.some(file => file.checked) && $('#workflowForm').checkValidity();
  readiness.textContent = ready ? 'Ready to switch on' : 'Setup needed';
  readiness.classList.toggle('is-ready', ready);
  if (flip.getAttribute('aria-checked') !== 'true') {
    label.textContent = ready ? 'Flip the switch when you are ready' : 'SwitchFlow is standing by';
    help.textContent = ready
      ? 'Your connected channels and business files are ready. Flip the switch to begin building the workflow.'
      : 'Finish Connections and Data & schedules first. Then SwitchFlow will prepare your business inputs for a new workflow.';
  }
}

function mountSetupBeforeSwitch() {
  const slot = $('#setupBeforeSwitch');
  const connections = $('#connectionsView');
  const data = $('#dataView');
  const brief = $('#workflowForm');
  if (!slot || !connections || !data || !brief) return;
  [connections, data].forEach(section => {
    section.classList.remove('view', 'is-visible');
    slot.append(section);
  });
  slot.append(brief);
}

// Mount the onboarding sections before any optional workspace rendering runs.
// This keeps account, chat, and data setup available even if the local API is offline.
mountSetupBeforeSwitch();

function enterWorkspace() {
  document.body.classList.remove('is-onboarding');
  document.body.classList.add('is-workspace-active');
  $$('.onboarding-nav').forEach(item => item.remove());
  setView('builder');
}

async function flipWorkspaceSwitch() {
  const flip = $('#workspaceSwitch');
  if (flip.getAttribute('aria-checked') === 'true') { setView('builder'); return; }
  try {
    if (!$('#switchLoginForm').hidden) { setView('connections'); showToast('Sign in to Switch first, then connect your business channels.'); return; }
    await refreshConnections();
    await refreshBusinessData();
    refreshOverviewReadiness();
    const hasConnection = workflowChatConnections.some(item => !['inactive','disconnected'].includes(String(item.status || '').toLowerCase()));
    const hasData = $$('#businessFiles input[name="fileIds"]:checked').length > 0;
    if (!hasConnection) { setView('connections'); showToast('Connect at least one business channel before switching on.'); return; }
    if (!hasData) { $('#workflowForm').scrollIntoView({behavior:'smooth',block:'start'}); showToast('Upload and select at least one business file before switching on.'); return; }
    if (!$('#workflowForm').reportValidity()) { $('#workflowForm').scrollIntoView({behavior:'smooth',block:'start'}); showToast('Complete your business brief before switching on.'); return; }
    flip.setAttribute('aria-checked','true');
    $('#workspaceReadiness').textContent = 'Inputs prepared';
    $('#switchLabel').textContent = 'SwitchFlow is on';
    $('#switchHelp').textContent = 'Your connected channels and business data are ready. Your workspace is now available.';
    localStorage.setItem('switchflow-workspace-active', 'true');
    const light = $('#lightReveal');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) light.classList.add('is-entering');
    setTimeout(() => {
      enterWorkspace();
      if (!reducedMotion) { light.classList.remove('is-entering'); light.classList.add('is-leaving'); }
      showToast('Building your agent workflow…');
      setTimeout(() => $('#workflowForm').requestSubmit(), 120);
      if (!reducedMotion) setTimeout(() => light.classList.remove('is-leaving'), 650);
    }, reducedMotion ? 0 : 480);
  } catch (error) { showToast(error.message); }
}

function setPhase(phase) {
  appState.phase = phase;
  const current = phases.indexOf(phase);
  $$(".spine-stage").forEach((stage, index) => {
    stage.classList.toggle("is-complete", index < current);
    stage.classList.toggle("is-current", index === current);
  });
}

function permissionText(value) {
  return { required: "Approval required", recommend: "Recommend only", automatic: "Automatic within limits" }[value];
}

function permissionNote(value) {
  return {
    required: "Agents prepare the action and wait for an authorized decision.",
    recommend: "Agents provide recommendations but cannot perform the action.",
    automatic: "Agents may perform low-risk actions only within the limits you define."
  }[value];
}

function buildWorkflow(form) {
  const data = new FormData(form);
  const key = data.get("businessType");
  const profile = businessProfiles[key];
  const selectedFiles=$$('#businessFiles input[name="fileIds"]:checked');
  const selectedChat=$('#workflowConnection').selectedOptions[0];
  return {
    key,
    label: profile.label,
    name: profile.name,
    goal: data.get("businessGoal").trim(),
    customerRequests:data.get('requestMode')==='customer',
    trigger: data.get("trigger"),
    scheduleTime:data.get('scheduleTime'),
    timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,
    permission: data.get("approval"),
    data:selectedFiles.map(input=>input.dataset.filename),
    fileIds:selectedFiles.map(input=>input.value),
    switchAgentIds:data.getAll('switchAgentIds'),
    aiConnectionId:String(data.get('aiConnectionId')||''),
    aiLabel:$('#workflowAiConnection').selectedOptions[0]?.textContent||'Local Codex setup',
    connectionId:String(data.get('connectionId')||''),
    channels:selectedChat?.dataset.type?[selectedChat.dataset.type]:[],
    channelName:selectedChat?.textContent||'',
    externalChannelId: String(data.get('externalChannelId') || '').trim(),
    metric: data.get("successMetric").trim() || profile.metric,
    agents: []
  };
}

function updateChatDestination(){
  const id=$('#workflowConnection').value;
  const connection=workflowChatConnections.find(item=>(item.bridge_id||item.id)===id);
  const type=String(connection?.bridge_type||connection?.type||'').toLowerCase();
  const needsExisting=type==='telegram'||connection?.channel_creation_supported===false;
  const input=$('#externalChannelId');
  input.value=rememberedChatDestinations[id]||'';
  input.required=!!connection&&needsExisting;
  $('#externalChannelLabel').textContent=needsExisting?'Existing chat or channel ID (required)':'Existing chat or channel ID (optional)';
  input.placeholder=needsExisting?'Enter the ID of your existing chat':'Leave blank to let Switch create a channel';
  $('#chatDestinationHint').textContent=!connection?'Sign in from Connections, then choose a connected chat app.':type==='telegram'
    ? 'Add your Telegram bot to the customer group, then enter that group’s chat ID. Customer orders such as “I want 10 cookies” must be sent in this exact group. Switch cannot create Telegram groups.'
    :needsExisting?'This app needs an existing channel ID before the workflow can start.':'Switch can create a channel for this app. Enter an existing channel ID to reuse one.';
}
function refreshWorkflowConnections(result){
  workflowChatConnections=Array.isArray(result.connections)?result.connections:result.connections?.bridges||[];
  rememberedChatDestinations=result.preferences?.destinations||{};
  const select=$('#workflowConnection');
  const current=select.value;
  select.replaceChildren();
  const active=workflowChatConnections.filter(item=>item.status!=='inactive'&&item.status!=='disconnected');
  if(!active.length){
    const option=document.createElement('option');option.value='';option.textContent='No chat apps connected — open Connections';select.append(option);
  }else for(const item of active){
    const option=document.createElement('option');option.value=item.bridge_id||item.id;
    option.dataset.type=item.bridge_type||item.type||'';
    option.textContent=`${item.display_name||item.name||item.bridge_type||item.type} (${item.bridge_type||item.type})`;
    select.append(option);
  }
  const preferred=current||result.preferences?.connectionId;
  if(active.some(item=>(item.bridge_id||item.id)===preferred))select.value=preferred;
  updateChatDestination();
}
async function rememberChatDestination(){
  const id=$('#workflowConnection').value;
  if(!id)return;
  const value=$('#externalChannelId').value.trim();
  if(value)rememberedChatDestinations[id]=value;
  else delete rememberedChatDestinations[id];
  await controlRequest('/api/chat-preferences','POST',{connectionId:id,channelId:value});
}
$('#workflowConnection').addEventListener('change',()=>{
  updateChatDestination();
  rememberChatDestination().catch(error=>$('#chatDestinationHint').textContent=error.message);
});
$('#externalChannelId').addEventListener('change',()=>rememberChatDestination().catch(error=>$('#chatDestinationHint').textContent=error.message));

function renderWorkflow(workflow) {
  $("#emptyState").hidden = true;
  $('#retryWorkflowButton').hidden = true;
  $("#generatedFlow").hidden = false;
  $("#flowBusiness").textContent = `${workflow.label.toUpperCase()} WORKFLOW`;
  $("#flowName").textContent = workflow.name;
  $("#permissionPill").textContent = permissionText(workflow.permission);
  $("#triggerSummary").textContent = workflow.trigger==='Daily'?`Daily at ${workflow.scheduleTime} (${workflow.timeZone})`:workflow.trigger;
  $("#successMetric").textContent = workflow.metric;
  $("#workflowIntegrations").innerHTML = `<h3>Your team chat integrations</h3>
    <div class="switch-channels"><span>${escapeHtml(workflow.channelName)}${workflow.externalChannelId?' · chat '+escapeHtml(workflow.externalChannelId):' · new channel'}</span></div>
    <p>Confirming creates this team under your signed-in Switch account. You can find the new agents in Switch Console → Your Agents.</p>
    ${workflow.chosenAgents?.length?`<h3>Agents invited from Switch</h3><ul>${workflow.chosenAgents.map(agent=>`<li>${escapeHtml(agent.label)} · @${escapeHtml(agent.name)}</li>`).join('')}</ul>`:''}`;
  $("#liveRail").innerHTML = workflow.agents.map((agent, index) => `
    <article class="rail-step ${agent[3] ? `is-${agent[3]}` : ""}">
      <span class="rail-node">${agent[0]}</span>
      <div class="rail-copy"><strong>${escapeHtml(agent[1])}</strong><span>${escapeHtml(agent[2])}</span></div>
      <span class="rail-status">${agent[3] === "approval" ? "human gate" : agent[3] === "output" ? "outcome" : agent[3] === "learning" ? "improve next run" : `handoff ${index + 1}`}</span>
    </article>`).join("");
  $("#runTopButton").disabled = false;
  $("#runTopButton").hidden = false;
  $("#activateButton").textContent='Create agents & run';
  updateContext();
  setPhase("review");
}

function updateContext() {
  if (!appState.workflow) return;
  const w = appState.workflow;
  $("#contextList").innerHTML = `
    <div><dt>Business</dt><dd>${w.label}</dd></div>
    <div><dt>Goal</dt><dd>${escapeHtml(w.goal)}</dd></div>
    <div><dt>AI</dt><dd>${escapeHtml(w.aiLabel||'Local Codex setup')}</dd></div>
    <div><dt>Trigger</dt><dd>${escapeHtml(w.trigger==='Daily'?`Daily at ${w.scheduleTime} (${w.timeZone})`:w.trigger)}</dd></div>
    <div><dt>Permission</dt><dd>${permissionText(w.permission)}</dd></div>
    <div><dt>Team chat</dt><dd>${escapeHtml(w.channelName||'No app selected')}${w.externalChannelId?' · '+escapeHtml(w.externalChannelId):''}</dd></div>
    <div><dt>Uploaded files</dt><dd>${w.data.length ? w.data.map(escapeHtml).join(", ") : "No files selected"}</dd></div>`;
}

function renderLibrary() {
  const saved = JSON.parse(localStorage.getItem("switchflow-workflows") || "[]");
  const all = [...saved, ...templates];
  const cards = items => items.map(item => `
    <article class="library-card">
      <p class="eyebrow">${item.business.toUpperCase()}</p>
      <h3>${item.name}</h3>
      <p>${item.desc}</p>
      <button class="template-use" type="button" data-template="${item.key || ""}" ${item.key ? "" : "disabled"}>${item.key ? "Use template" : "Saved run"}</button>
      ${item.sample ? `<a class="template-sample" href="./examples/${encodeURIComponent(item.sample)}" download>Download sample data</a>` : ''}
      <footer><span>${item.key ? 'Owner approval' : `${item.steps} agents`}</span><span class="mini-status">● ${item.status}</span></footer>
    </article>`).join("");
  $("#libraryGrid").innerHTML = cards(all);
  $("#sectorShowcaseGrid").innerHTML = cards(templates);
  $$(".template-use[data-template]").forEach(button => button.addEventListener("click", () => loadTemplate(button.dataset.template)));
}

function loadTemplate(key) {
  if (!templateDefaults[key]) return;
  if (document.body.classList.contains('is-workspace-active')) {
    sessionStorage.setItem('switchflow-pending-template', key);
    localStorage.removeItem('switchflow-workspace-active');
    window.location.reload();
    return;
  }
  $("#businessType").value = key;
  $("#businessGoal").value = templateDefaults[key].goal;
  $("#successMetricInput").value = templateDefaults[key].metric;
  $("#requestMode").value = 'owner';
  $("#trigger").value = templateDefaults[key].trigger || 'Manually';
  if (templateDefaults[key].scheduleTime) $("#scheduleTime").value = templateDefaults[key].scheduleTime;
  $("#approval").value = 'required';
  $("#controlNote").textContent = permissionNote('required');
  $$('#businessFiles input[name="fileIds"]').forEach(input => { input.checked = false; });
  refreshOverviewReadiness();
  $('#workflowForm').scrollIntoView({behavior:'smooth',block:'start'});
  showToast(`${businessProfiles[key].label} brief loaded. Upload and select its sample data, then flip the switch.`);
}

function saveWorkflow() {
  if (!appState.workflow) return;
  const saved = JSON.parse(localStorage.getItem("switchflow-workflows") || "[]");
  const item = {
    key: "",
    business: appState.workflow.label,
    name: appState.workflow.name,
    desc: appState.workflow.goal,
    status: "Active",
    steps: appState.workflow.agents.length
  };
  const deduped = [item, ...saved.filter(x => x.name !== item.name)].slice(0, 4);
  localStorage.setItem("switchflow-workflows", JSON.stringify(deduped));
  renderLibrary();
}

function getRunHistory() {
  return JSON.parse(localStorage.getItem("switchflow-runs") || "[]");
}

function saveRun(decision, outcome) {
  if (!appState.workflow) return;
  const runs = getRunHistory();
  runs.unshift({
    id: appState.runId,
    business: appState.workflow.label,
    name: appState.workflow.name,
    decision,
    outcome,
    evidence: appState.events.length,
    metric: appState.workflow.metric,
    completed: new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
  });
  localStorage.setItem("switchflow-runs", JSON.stringify(runs.slice(0, 12)));
  renderHistory();
}

function renderHistory() {
  const runs = getRunHistory();
  $("#historyBadge").textContent = runs.length;
  const verified = runs.filter(run => run.outcome === "Verified").length;
  $("#historySummary").innerHTML = `
    <article><span>Total runs</span><strong>${runs.length}</strong></article>
    <article><span>Verified outcomes</span><strong>${verified}</strong></article>
    <article><span>Human decisions</span><strong>${runs.filter(run => run.decision).length}</strong></article>
    <article><span>Evidence records</span><strong>${runs.reduce((sum, run) => sum + run.evidence, 0)}</strong></article>`;
  $("#historyTableBody").innerHTML = runs.length ? runs.map(run => `
    <tr>
      <td><strong>${run.id}</strong><small>${run.name}</small></td>
      <td>${run.business}</td>
      <td><span class="decision-pill">${run.decision}</span></td>
      <td><span class="outcome-pill ${run.outcome === "Verified" ? "is-verified" : ""}">${run.outcome}</span></td>
      <td>${run.evidence} records</td>
      <td>${run.completed}</td>
    </tr>`).join("") : `<tr><td colspan="6" class="empty-table">No completed runs yet. Run a workflow to create an audit record.</td></tr>`;
}

function eventMarkup(event) {
  return `<article class="event ${event.type ? `is-${event.type}` : ""}">
    <span class="event-avatar">${escapeHtml(event.initials)}</span>
    <div><h3>${escapeHtml(event.agent)}</h3><p>${escapeHtml(event.message)}</p></div>
    <time>${escapeHtml(event.time)}</time>
  </article>`;
}

function pushEvent(agent, initials, message, type = "") {
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const event = { agent, initials, message, type, time: now };
  appState.events.push(event);
  $("#eventStream").innerHTML = appState.events.map(eventMarkup).join("");
  $("#roomBadge").textContent = appState.events.length;
  updateEvidence();
}

function updateEvidence() {
  const hasRequest = appState.events.length > 0;
  const hasDecision = appState.approved || appState.events.some(event => event.initials === "NO");
  const hasExecution = appState.events.some(event => event.type === "complete");
  const hasVerification = appState.events.some(event => event.agent === "Verification Agent" || event.agent === "Performance Agent");
  const items = [
    ["Request", hasRequest],
    ["Human decision", hasDecision],
    ["Execution record", hasExecution],
    ["Verified outcome", hasVerification]
  ];
  $("#evidenceList").innerHTML = items.map(([label, ready]) => `<li><span>${label}</span><strong class="${ready ? "is-ready" : ""}">${ready ? "Recorded" : "Waiting"}</strong></li>`).join("");
}

function renderApproval() {
  const list = $("#approvalList");
  if (!appState.approvalPending) {
    list.innerHTML = `<div class="room-empty"><strong>No decisions waiting.</strong><p>Proposed actions appear here before execution.</p></div>`;
    $("#approvalBadge").textContent = "0";
    return;
  }
  const w = appState.workflow;
  const proposal=appState.fileProposal;
  const order=appState.order;
  if(order){
    const available=order.capacity?.available;
    list.innerHTML=`<article class="approval-card"><div><p class="eyebrow">CUSTOMER ORDER</p><h3>Do you want to accept ${escapeHtml(order.customerName)}'s order for ${order.quantity} ${escapeHtml(order.item)}?</h3><p>${order.previousQuantity?`Already confirmed: ${order.previousQuantity}. New total if accepted: ${order.previousQuantity+order.quantity}.`:''}</p><dl class="decision-packet"><div><dt>Available in your records</dt><dd>${Number.isInteger(available)?`${available} ${escapeHtml(order.item)}`:'No matching capacity record'}</dd></div><div><dt>Before you decide</dt><dd>${!order.agentAssessment?'The agent check is still in progress. If you have confirmed the fulfillment time, recipe, usable stock, staff, equipment, and other commitments yourself, you can accept now.':order.agentAssessment.status==='unknown'?'Please check ingredients, staff, and other commitments yourself. The uploaded file alone does not confirm these.':order.agentAssessment.status==='unfeasible'?'The agent found this order cannot be filled from current records.':'The agent reviewed the available evidence.'}</dd></div></dl><p>Accepting reserves these items in your file and tells the customer. Declining tells the customer without changing the file.</p></div><div class="approval-actions"><button class="button ghost" id="rejectButton" type="button">Decline order</button><button class="button primary" id="approveButton" type="button" ${order.capacity?.status==='feasible'&&order.agentAssessment?.status!=='unfeasible'?'':'disabled'}>Accept order</button></div></article>`;
    $('#approvalBadge').textContent='1';$('#approveButton').addEventListener('click',approveAction);$('#rejectButton').addEventListener('click',rejectAction);return;
  }
  list.innerHTML = `
    <article class="approval-card">
      <div>
        <p class="eyebrow">ACTION PREPARED / ${escapeHtml(w.label.toUpperCase())}</p>
        <h3>Approve the proposed ${escapeHtml(w.name.toLowerCase())} action?</h3>
        <p>${proposal?'The analyst proposed this exact change to an uploaded CSV. Approving will save it in your SwitchFlow workspace and record the action in Switch.':'The agents completed their analysis. This run has no validated file edit, so approval continues with a proposed action record only.'}</p>
        <div class="approval-meta"><span>${w.agents.length} agent steps</span><span>${w.data.length} uploaded files</span><span>${escapeHtml(w.trigger)}</span></div>
        <dl class="decision-packet">
          <div><dt>Expected benefit</dt><dd>${escapeHtml(w.metric)}</dd></div>
          <div><dt>Risk and limit</dt><dd>${proposal?'Only the shown local CSV cell will change. No supplier, customer, or payment is contacted.':'No connected external action will occur.'}</dd></div>
          <div><dt>Evidence</dt><dd>${w.data.length ? w.data.map(escapeHtml).join(", ") : "No business files selected"}</dd></div>
          <div><dt>Verification test</dt><dd>Verifier must compare the execution record with the success measure.</dd></div>
          ${proposal?`<div><dt>Exact file edit</dt><dd>${escapeHtml(proposal.fileName)} · row ${proposal.row} · ${escapeHtml(proposal.columnName)}: ${escapeHtml(proposal.before)} → ${escapeHtml(proposal.value)} (version ${proposal.expectedVersion})</dd></div><div><dt>Reason</dt><dd>${escapeHtml(proposal.reason)}</dd></div>`:''}
        </dl>
      </div>
      <div class="approval-actions">
        <button class="button ghost" type="button" id="rejectButton">Reject</button>
        <button class="button primary" type="button" id="approveButton">${proposal?'Approve & update file':'Approve action'}</button>
      </div>
    </article>`;
  $("#approvalBadge").textContent = "1";
  $("#approveButton").addEventListener("click", () => approveAction());
  $("#rejectButton").addEventListener("click", rejectAction);
}

function openTeamApproval(team){
  appState.teamId=team.id;appState.runId=team.id;
  appState.workflow={label:team.workflow.business||'Business',name:team.title,goal:team.workflow.goal,metric:team.workflow.metric,trigger:team.workflow.trigger,data:team.files||[],agents:team.agents||[],permission:team.workflow.permission};
  appState.fileProposal=team.fileProposal||null;appState.approvalPending=true;appState.running=true;
  appState.order=team.order||null;
  renderApproval();setPhase('approve');setView('approvals');
}

async function openTeamActivity(team){
  const result=await controlRequest(`/api/teams/${team.id}/activity`);
  appState.teamId=team.id;appState.runId=team.id;
  appState.workflow={label:team.workflow.business||'Business',name:team.title,goal:team.workflow.goal,metric:team.workflow.metric,trigger:team.workflow.trigger,data:team.files||[],agents:team.agents||[],permission:team.workflow.permission};
  appState.fileProposal=team.fileProposal||null;appState.approvalPending=team.approvalPending;appState.running=!team.completedAt;
  appState.order=team.order||null;
  appState.events=result.messages.map(item=>({agent:item.sender_name||item.sender||'Switch participant',initials:'SW',message:item.body||'',type:'',time:'Switch room'}));
  $('#eventStream').innerHTML=appState.events.length?appState.events.map(eventMarkup).join(''):'<div class="room-empty"><strong>No room messages yet.</strong></div>';
  $('#roomBadge').textContent=appState.events.length;
  $('#runStateText').textContent=team.approvalPending?'Waiting for your approval':team.completedAt?'Run completed':'Agents working';
  $('#runDot').classList.toggle('is-running',!team.completedAt);
  updateContext();updateEvidence();renderApproval();setView('room');
}

async function runWorkflow() {
  if (!appState.workflow || appState.running) return;
  appState.running = true;
  appState.events = [];
  appState.approvalPending = false;
  appState.approved = false;
  appState.fileProposal=null;
  appState.order=null;
  const startedAt = new Date();
  const localDate = [startedAt.getFullYear(), String(startedAt.getMonth() + 1).padStart(2, "0"), String(startedAt.getDate()).padStart(2, "0")].join("");
  appState.runId = `SF-${localDate}-${String(Date.now()).slice(-4)}`;
  $("#eventStream").innerHTML = "";
  $("#runDot").classList.add("is-running");
  $("#runStateText").textContent = "Agents working";
  setPhase("plan");
  setView("room");
  pushEvent("SwitchFlow App", "SF", "Sending the business request to the live Switch room…");
  try {
    const response = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId:appState.workflow.planId,
        teamId:appState.teamId,
        name:appState.workflow.name,
        business: appState.workflow.label,
        goal: appState.workflow.goal,
        metric: appState.workflow.metric,
        trigger: appState.workflow.trigger,
        permission: permissionText(appState.workflow.permission),
        data: appState.workflow.data,
        fileIds:appState.workflow.fileIds,
        scheduleTime:appState.workflow.scheduleTime,
        timeZone:appState.workflow.timeZone,
        channels: appState.workflow.channels,
        connectionId:appState.workflow.connectionId,
        externalChannelId: appState.workflow.externalChannelId
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Switch rejected the request.");
    appState.runId = result.runId;
    appState.teamId=result.team.id;
    pushEvent('SwitchFlow','SF',`${result.team.agents.length} agents created under your Switch account. Room: ${result.room.name}.`);
    $("#runStateText").textContent = "Live agents working in Switch";
    showToast("Request accepted by the live Switch room.");
    if(typeof refreshBusinessData==='function')refreshBusinessData().catch(()=>{});
  } catch (error) {
    appState.running = false;
    $("#runDot").classList.remove("is-running");
    $("#runStateText").textContent = "Run did not start";
    pushEvent("Connection", "!", error.message, "risk");
  }
}

async function approveAction() {
  try {
    if(!appState.teamId)throw new Error('Open this team from Connections → Open requests & results, then review its approval.');
    const response = await fetch("/api/approvals", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({decision:'approve',teamId:appState.teamId}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Approval failed.");
    appState.approvalPending = false;
    appState.approved = true;
    renderApproval();
    setPhase('execute');
    setView('room');
    showToast(result.customerReply?'Order accepted and customer reply posted in the shared group.':result.appliedFileChange?`${result.appliedFileChange.fileName} updated and approval recorded in Switch.`:'Your approval was recorded in Switch.');
    if(result.appliedFileChange&&typeof refreshBusinessData==='function')refreshBusinessData().catch(()=>{});
  } catch (error) {
    showToast(error.message);
    $("#runStateText").textContent = "Approval not submitted — check Connections";
  }
}

async function handleLiveEvent(event) {
  if(event.teamId&&!appState.teamId){
    if(event.type!=='order'&&!(event.type==='room_message'&&event.kind==='analyst'&&/APPROVAL REQUIRED/i.test(event.body||'')))return;
    const teams=await controlRequest('/api/teams');
    const team=teams.find(item=>item.id===event.teamId);
    if(!team)return;
    appState.teamId=team.id;appState.runId=team.id;
    appState.workflow={label:team.workflow.business||'Business',name:team.title,goal:team.workflow.goal,metric:team.workflow.metric,trigger:team.workflow.trigger,data:team.files||[],agents:team.agents||[],permission:team.workflow.permission};
    appState.order=team.order||null;
  }
  if(event.type==='order'&&event.teamId===appState.teamId){appState.order=event.order;appState.approvalPending=true;renderApproval();pushEvent('SwitchFlow','SF',`Customer order received from ${event.order.customerName}: ${event.order.quantity} ${event.order.item}. Capacity check started.`);return;}
  if(event.type==='chat_file'){
    if(typeof refreshBusinessData==='function')refreshBusinessData().catch(()=>{});
    if(event.status==='imported')showToast(`${event.name} arrived from chat and is ready in Data & schedules.`);
    else showToast(`${event.name}: ${event.detail}`);
    return;
  }
  if(event.type==='scheduled_run'){
    if(event.teamId===appState.teamId){appState.runId=event.runId;appState.running=true;appState.approved=false;appState.approvalPending=false;renderApproval();setPhase('plan');pushEvent('SwitchFlow schedule','SC','A new daily run started with the latest uploaded file versions.');}
    return;
  }
  if (event.type === "status") {
    $("#switchConnectionLabel").textContent = event.connected ? "Connected to Switch agents" : "Connecting to Switch…";
    return;
  }
  if (event.type !== "room_message") return;
  if(event.teamId && appState.teamId && event.teamId!==appState.teamId)return;
  const sender = event.sender || "Switch participant";
  const initials = sender.split(/[-\s]/).filter(Boolean).slice(-2).map(word => word[0].toUpperCase()).join("") || "SW";
  let type = "";
  if ((event.kind==='analyst'||sender.includes("analyst")) && /APPROVAL REQUIRED/i.test(event.body)) { type = "risk"; setPhase("approve"); appState.fileProposal=event.fileProposal||null; if(event.order)appState.order=event.order; appState.approvalPending = !appState.order||['checking','pending'].includes(appState.order.status); renderApproval();if(event.proposalError)showToast(event.proposalError); }
  if (event.humanApproval) { appState.approved = true; appState.approvalPending = false; renderApproval(); setPhase("execute"); }
  if (sender.includes("operator")) { type = "complete"; setPhase("execute"); }
  if (sender.includes("verifier")) { type = "complete"; setPhase("verify"); }
  if (sender.includes("architect") && /VERIFIED|PARTIAL|FAILED|CANNOT VERIFY/i.test(event.body)) { setPhase("improve"); appState.running = false; $("#runDot").classList.remove("is-running"); }
  pushEvent(sender, initials, event.body, type);
}

function connectToSwitch() {
  const stream = new EventSource("/api/events");
  let liveQueue=Promise.resolve();
  stream.onmessage = message => {liveQueue=liveQueue.then(()=>handleLiveEvent(JSON.parse(message.data))).catch(error=>showToast(error.message));};
  stream.onerror = () => { $("#switchConnectionLabel").textContent = "Reconnecting to Switch…"; };
}

async function rejectAction() {
  try {
    const response = await fetch('/api/approvals', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision:'reject',teamId:appState.teamId})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Rejection failed.');
    appState.approvalPending = false; renderApproval();
    $("#runStateText").textContent = "Rejected by owner";
    showToast('Your rejection was recorded in Switch.');
  } catch (error) { showToast(error.message); }
}

function resetDemo() {
  appState.workflow = null;
  appState.running = false;
  appState.approvalPending = false;
  appState.events = [];
  appState.runId = null;
  $("#emptyState").hidden = false;
  localStorage.removeItem('switchflow-current-workflow');
  $("#generatedFlow").hidden = true;
  $("#runTopButton").disabled = true;
  $("#runTopButton").hidden = true;
  $("#roomBadge").textContent = "0";
  $("#approvalBadge").textContent = "0";
  $("#eventStream").innerHTML = `<div class="room-empty"><strong>No workflow is running.</strong><p>Generate and activate a workflow to watch agent handoffs.</p></div>`;
  $("#runStateText").textContent = "Waiting for a workflow";
  $("#runDot").classList.remove("is-running");
  updateEvidence();
  setPhase("understand");
  renderApproval();
  setView("builder");
  showToast("Demo reset.");
}

$$('.nav-item').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
$('#roomBack').addEventListener('click',()=>setView(document.body.classList.contains('is-onboarding')?'connections':'builder'));
$('#workspaceSwitch').addEventListener('click', flipWorkspaceSwitch);
$('#workflowForm').addEventListener('input', refreshOverviewReadiness);
$('#workflowForm').addEventListener('change', refreshOverviewReadiness);
$("#workflowForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (document.body.classList.contains('is-onboarding')) { showToast('Complete your setup, then flip the switch to build your workflow.'); return; }
  $('#workflowStatusTitle').textContent = 'Preparing your agent workflow';
  $('#workflowStatusCopy').textContent = 'SwitchFlow is designing the agent handoffs and approval gate from your business brief.';
  $('#retryWorkflowButton').hidden = true;
  $('#emptyState').hidden = false;
  const workflow=buildWorkflow(event.currentTarget);
  if(!workflow.connectionId){showToast('Choose a connected chat app before generating your workflow.');$('#workflowConnection').focus();return;}
  const selectedConnection=workflowChatConnections.find(item=>(item.bridge_id||item.id)===workflow.connectionId);
  if((selectedConnection?.bridge_type==='telegram'||selectedConnection?.type==='telegram'||selectedConnection?.channel_creation_supported===false)&&!workflow.externalChannelId){
    showToast('Enter your existing chat ID before generating the workflow.');$('#externalChannelId').focus();return;
  }
  const button=event.currentTarget.querySelector('button[type=submit]');
  button.disabled=true;button.textContent='Designing your agent team…';
  $("#runTopButton").disabled=true;$("#generatedFlow").hidden=true;
  try{
    const response=await fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...workflow,business:workflow.label})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Could not generate the team.');
    workflow.planId=result.planId;workflow.name=result.title;workflow.chosenAgents=result.chosenAgents||[];
    workflow.agents=result.agents.flatMap(agent=>{
      const display=[agent.displayName.split(/\s/).map(word=>word[0]).slice(0,2).join(''),agent.displayName,agent.description,agent.kind==='operator'||agent.kind==='verifier'?'output':''];
      return agent.kind==='operator'?[['OK','Your approval','You approve the proposed action before execution.','approval'],display]:[display];
    });
    appState.workflow=workflow;appState.teamId=null;
    localStorage.setItem('switchflow-current-workflow', JSON.stringify(workflow));
    renderWorkflow(workflow);showToast('Review your AI-designed team, then create the agents.');
  }catch(error){showToast(error.message);$('#workflowStatusTitle').textContent='Could not build your workflow';$('#workflowStatusCopy').textContent=error.message;$('#retryWorkflowButton').hidden=false;$("#emptyState").hidden=false;}
  finally{button.disabled=false;button.textContent='Generate my workflow';}
});
$("#approval").addEventListener("change", event => {
  $("#controlNote").textContent = permissionNote(event.target.value);
});
$("#activateButton").addEventListener("click", runWorkflow);
$("#runTopButton").addEventListener("click", runWorkflow);
$("#resetButton").addEventListener("click", resetDemo);
$("#newWorkflowButton").addEventListener("click", () => { localStorage.removeItem('switchflow-workspace-active'); window.location.reload(); });
$('#retryWorkflowButton').addEventListener('click', () => $('#workflowForm').requestSubmit());

renderLibrary();
renderHistory();
updateEvidence();
refreshOverviewReadiness();
if (localStorage.getItem('switchflow-setup-version') !== '2') {
  localStorage.removeItem('switchflow-workspace-active');
  localStorage.setItem('switchflow-setup-version', '2');
}
if (localStorage.getItem('switchflow-workspace-active') === 'true') {
  enterWorkspace();
  try {
    const savedWorkflow = JSON.parse(localStorage.getItem('switchflow-current-workflow') || 'null');
    if (savedWorkflow?.agents?.length) {
      appState.workflow = savedWorkflow; renderWorkflow(savedWorkflow);
      // Plans are kept in backend memory, while created teams survive restart.
      // Reattach the saved screen to its created team before the next request.
      controlRequest('/api/teams').then(teams=>{
        if(appState.workflow!==savedWorkflow||appState.teamId)return;
        const matches=teams.filter(team=>team.title===savedWorkflow.name&&team.workflow.goal===savedWorkflow.goal);
        if(matches.length===1)appState.teamId=matches[0].id;
      }).catch(()=>{});
    }
    else { $('#workflowStatusTitle').textContent='Your workflow is ready to build';$('#workflowStatusCopy').textContent='Use your saved business brief to build the agent team.';$('#retryWorkflowButton').hidden=false; }
  } catch { $('#retryWorkflowButton').hidden=false; }
}
const pendingTemplate = sessionStorage.getItem('switchflow-pending-template');
if (pendingTemplate && document.body.classList.contains('is-onboarding')) {
  sessionStorage.removeItem('switchflow-pending-template');
  requestAnimationFrame(() => loadTemplate(pendingTemplate));
}
connectToSwitch();
