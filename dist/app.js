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
  { business: "Restaurant", name: "Waste reduction", desc: "Forecast demand, protect expiring stock, and prepare an approved ingredient order.", status: "Ready", steps: 7 },
  { business: "Retail", name: "Smart replenishment", desc: "Detect shortages and dead stock before creating a controlled purchase order.", status: "Template", steps: 7 },
  { business: "Freelancer", name: "Scope protection", desc: "Identify out-of-scope requests and prepare an approved change order and invoice.", status: "Template", steps: 7 }
];

const appState = {
  workflow: null,
  running: false,
  approvalPending: false,
  approved: false,
  events: []
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function setView(view) {
  const titles = { builder: "Build a workflow", room: "Agent room", approvals: "Approval inbox", library: "Workflow library" };
  $$(".view").forEach(el => el.classList.remove("is-visible"));
  $$(".nav-item").forEach(el => el.classList.toggle("is-active", el.dataset.view === view));
  $(`#${view}View`).classList.add("is-visible");
  $("#viewTitle").textContent = titles[view];
}

function permissionText(value) {
  return { required: "Approval required", recommend: "Recommend only", automatic: "Automatic within limits" }[value];
}

function buildWorkflow(form) {
  const data = new FormData(form);
  const key = data.get("businessType");
  const profile = businessProfiles[key];
  return {
    key,
    label: profile.label,
    name: profile.name,
    goal: data.get("businessGoal").trim(),
    trigger: data.get("trigger"),
    permission: data.get("approval"),
    data: data.getAll("data"),
    metric: profile.metric,
    agents: profile.agents
  };
}

function renderWorkflow(workflow) {
  $("#emptyState").hidden = true;
  $("#generatedFlow").hidden = false;
  $("#flowBusiness").textContent = `${workflow.label.toUpperCase()} WORKFLOW`;
  $("#flowName").textContent = workflow.name;
  $("#permissionPill").textContent = permissionText(workflow.permission);
  $("#triggerSummary").textContent = workflow.trigger;
  $("#successMetric").textContent = workflow.metric;
  $("#liveRail").innerHTML = workflow.agents.map((agent, index) => `
    <article class="rail-step ${agent[3] ? `is-${agent[3]}` : ""}">
      <span class="rail-node">${agent[0]}</span>
      <div class="rail-copy"><strong>${agent[1]}</strong><span>${agent[2]}</span></div>
      <span class="rail-status">${agent[3] === "approval" ? "human gate" : agent[3] === "output" ? "outcome" : `handoff ${index + 1}`}</span>
    </article>`).join("");
  $("#runTopButton").disabled = false;
  updateContext();
}

function updateContext() {
  if (!appState.workflow) return;
  const w = appState.workflow;
  $("#contextList").innerHTML = `
    <div><dt>Business</dt><dd>${w.label}</dd></div>
    <div><dt>Goal</dt><dd>${w.goal}</dd></div>
    <div><dt>Trigger</dt><dd>${w.trigger}</dd></div>
    <div><dt>Permission</dt><dd>${permissionText(w.permission)}</dd></div>
    <div><dt>Data sources</dt><dd>${w.data.length ? w.data.join(", ") : "No connected data"}</dd></div>`;
}

function renderLibrary() {
  const saved = JSON.parse(localStorage.getItem("switchflow-workflows") || "[]");
  const all = [...saved, ...templates];
  $("#libraryGrid").innerHTML = all.map(item => `
    <article class="library-card">
      <p class="eyebrow">${item.business.toUpperCase()}</p>
      <h3>${item.name}</h3>
      <p>${item.desc}</p>
      <footer><span>${item.steps} steps</span><span class="mini-status">● ${item.status}</span></footer>
    </article>`).join("");
}

function saveWorkflow() {
  if (!appState.workflow) return;
  const saved = JSON.parse(localStorage.getItem("switchflow-workflows") || "[]");
  const item = {
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

function eventMarkup(event) {
  return `<article class="event ${event.type ? `is-${event.type}` : ""}">
    <span class="event-avatar">${event.initials}</span>
    <div><h3>${event.agent}</h3><p>${event.message}</p></div>
    <time>${event.time}</time>
  </article>`;
}

function pushEvent(agent, initials, message, type = "") {
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const event = { agent, initials, message, type, time: now };
  appState.events.push(event);
  $("#eventStream").innerHTML = appState.events.map(eventMarkup).join("");
  $("#roomBadge").textContent = appState.events.length;
}

function renderApproval() {
  const list = $("#approvalList");
  if (!appState.approvalPending) {
    list.innerHTML = `<div class="room-empty"><strong>No decisions waiting.</strong><p>Proposed actions appear here before execution.</p></div>`;
    $("#approvalBadge").textContent = "0";
    return;
  }
  const w = appState.workflow;
  list.innerHTML = `
    <article class="approval-card">
      <div>
        <p class="eyebrow">ACTION PREPARED / ${w.label.toUpperCase()}</p>
        <h3>Approve the proposed ${w.name.toLowerCase()} action?</h3>
        <p>The agents completed their analysis and prepared the next action. Review the goal, evidence, and control level before execution.</p>
        <div class="approval-meta"><span>${w.agents.length} agent steps</span><span>${w.data.length} data sources</span><span>${w.trigger}</span></div>
      </div>
      <div class="approval-actions">
        <button class="button ghost" type="button" id="rejectButton">Reject</button>
        <button class="button primary" type="button" id="approveButton">Approve action</button>
      </div>
    </article>`;
  $("#approvalBadge").textContent = "1";
  $("#approveButton").addEventListener("click", approveAction);
  $("#rejectButton").addEventListener("click", rejectAction);
}

function runWorkflow() {
  if (!appState.workflow || appState.running) return;
  appState.running = true;
  appState.events = [];
  appState.approvalPending = false;
  appState.approved = false;
  $("#eventStream").innerHTML = "";
  $("#runDot").classList.add("is-running");
  $("#runStateText").textContent = "Agents working";
  setView("room");

  const w = appState.workflow;
  const analysisAgents = w.agents.filter(agent => agent[3] !== "approval" && agent[3] !== "output");
  const messages = [
    `Request structured: “${w.goal}”`,
    `Connected ${w.data.length || 0} available data source${w.data.length === 1 ? "" : "s"} and checked readiness.`,
    `Analysis complete. The strongest action supports: ${w.metric.toLowerCase()}.`,
    `Plan prepared with limits and an evidence trail for human review.`
  ];

  analysisAgents.forEach((agent, index) => {
    setTimeout(() => pushEvent(agent[1], agent[0], messages[Math.min(index, messages.length - 1)]), 500 + index * 750);
  });

  setTimeout(() => {
    const gate = w.agents.find(agent => agent[3] === "approval");
    pushEvent(gate[1], gate[0], "Action is ready. Execution is paused until an authorized person decides.", "risk");
    appState.approvalPending = true;
    appState.running = false;
    $("#runDot").classList.remove("is-running");
    $("#runStateText").textContent = "Waiting for approval";
    renderApproval();
    showToast("A decision is waiting in the approval inbox.");
  }, 700 + analysisAgents.length * 800);
}

function approveAction() {
  appState.approvalPending = false;
  appState.approved = true;
  renderApproval();
  setView("room");
  $("#runDot").classList.add("is-running");
  $("#runStateText").textContent = "Executing approved action";
  const outputs = appState.workflow.agents.filter(agent => agent[3] === "output");
  outputs.forEach((agent, index) => setTimeout(() => {
    pushEvent(agent[1], agent[0], index === outputs.length - 1 ? `Result verified against: ${appState.workflow.metric}.` : "Approved action completed and recorded in the shared room.", "complete");
    if (index === outputs.length - 1) {
      $("#runDot").classList.remove("is-running");
      $("#runStateText").textContent = "Run completed and verified";
      saveWorkflow();
      showToast("Workflow completed and verified.");
    }
  }, 500 + index * 900));
}

function rejectAction() {
  appState.approvalPending = false;
  renderApproval();
  pushEvent("Approval Agent", "NO", "The proposed action was rejected. No execution occurred.", "risk");
  $("#runStateText").textContent = "Stopped by owner";
  setView("room");
  showToast("Action rejected. Nothing was executed.");
}

function resetDemo() {
  appState.workflow = null;
  appState.running = false;
  appState.approvalPending = false;
  appState.events = [];
  $("#emptyState").hidden = false;
  $("#generatedFlow").hidden = true;
  $("#runTopButton").disabled = true;
  $("#roomBadge").textContent = "0";
  $("#approvalBadge").textContent = "0";
  $("#eventStream").innerHTML = `<div class="room-empty"><strong>No workflow is running.</strong><p>Generate and activate a workflow to watch agent handoffs.</p></div>`;
  $("#runStateText").textContent = "Waiting for a workflow";
  $("#runDot").classList.remove("is-running");
  renderApproval();
  setView("builder");
  showToast("Demo reset.");
}

$$('.nav-item').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
$("#workflowForm").addEventListener("submit", event => {
  event.preventDefault();
  appState.workflow = buildWorkflow(event.currentTarget);
  renderWorkflow(appState.workflow);
  showToast("Workflow generated. Review the handoffs before activation.");
});
$("#activateButton").addEventListener("click", runWorkflow);
$("#runTopButton").addEventListener("click", runWorkflow);
$("#resetButton").addEventListener("click", resetDemo);
$("#newWorkflowButton").addEventListener("click", () => setView("builder"));

renderLibrary();
