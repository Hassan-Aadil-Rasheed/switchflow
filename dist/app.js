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
  { key: "restaurant", business: "Restaurant", name: "Waste reduction", desc: "Forecast demand, protect expiring stock, and prepare an approved ingredient order.", status: "Ready", steps: 8 },
  { key: "retail", business: "Retail", name: "Smart replenishment", desc: "Detect shortages and dead stock before creating a controlled purchase order.", status: "Template", steps: 8 },
  { key: "freelancer", business: "Freelancer", name: "Scope protection", desc: "Identify out-of-scope requests and prepare an approved change order and invoice.", status: "Template", steps: 8 }
];

const templateDefaults = {
  restaurant: {
    goal: "Every evening, predict tomorrow's demand, reduce food waste, and prepare an ingredient order for manager approval.",
    metric: "Reduce avoidable waste by 20% without creating stock-outs."
  },
  retail: {
    goal: "Review stock and sales daily, identify shortages and dead stock, compare suppliers, and prepare a purchase order for owner approval.",
    metric: "Cut stock-outs by 15% while reducing slow-moving inventory."
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
  approved: false,
  events: [],
  phase: "understand",
  runId: null
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
  const titles = { builder: "Build a workflow", room: "Agent room", approvals: "Approval inbox", library: "Workflow library", history: "Run history" };
  $$(".view").forEach(el => el.classList.remove("is-visible"));
  $$(".nav-item").forEach(el => el.classList.toggle("is-active", el.dataset.view === view));
  $(`#${view}View`).classList.add("is-visible");
  $("#viewTitle").textContent = titles[view];
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
  return {
    key,
    label: profile.label,
    name: profile.name,
    goal: data.get("businessGoal").trim(),
    trigger: data.get("trigger"),
    permission: data.get("approval"),
    data: data.getAll("data"),
    metric: data.get("successMetric").trim() || profile.metric,
    agents: [...profile.agents, ["LR", "Learning Agent", "Uses the verified result to improve the next run.", "learning"]]
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
      <span class="rail-status">${agent[3] === "approval" ? "human gate" : agent[3] === "output" ? "outcome" : agent[3] === "learning" ? "improve next run" : `handoff ${index + 1}`}</span>
    </article>`).join("");
  $("#runTopButton").disabled = false;
  updateContext();
  setPhase("review");
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
      <button class="template-use" type="button" data-template="${item.key || ""}" ${item.key ? "" : "disabled"}>${item.key ? "Use template" : "Saved run"}</button>
      <footer><span>${item.steps} steps</span><span class="mini-status">● ${item.status}</span></footer>
    </article>`).join("");
  $$(".template-use[data-template]").forEach(button => button.addEventListener("click", () => loadTemplate(button.dataset.template)));
}

function loadTemplate(key) {
  if (!templateDefaults[key]) return;
  $("#businessType").value = key;
  $("#businessGoal").value = templateDefaults[key].goal;
  $("#successMetricInput").value = templateDefaults[key].metric;
  setView("builder");
  $("#workflowForm").requestSubmit();
  showToast(`${businessProfiles[key].label} template loaded.`);
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
  list.innerHTML = `
    <article class="approval-card">
      <div>
        <p class="eyebrow">ACTION PREPARED / ${w.label.toUpperCase()}</p>
        <h3>Approve the proposed ${w.name.toLowerCase()} action?</h3>
        <p>The agents completed their analysis and prepared the next action. Nothing executes until an authorized person decides.</p>
        <div class="approval-meta"><span>${w.agents.length} agent steps</span><span>${w.data.length} data sources</span><span>${w.trigger}</span></div>
        <dl class="decision-packet">
          <div><dt>Expected benefit</dt><dd>${w.metric}</dd></div>
          <div><dt>Risk and limit</dt><dd>Simulated action only; no supplier, customer, or payment is contacted.</dd></div>
          <div><dt>Evidence</dt><dd>${w.data.length ? w.data.join(", ") : "No business data connected"}</dd></div>
          <div><dt>Verification test</dt><dd>Verifier must compare the execution record with the success measure.</dd></div>
        </dl>
      </div>
      <div class="approval-actions">
        <button class="button ghost" type="button" id="rejectButton">Reject</button>
        <button class="button primary" type="button" id="approveButton">Approve action</button>
      </div>
    </article>`;
  $("#approvalBadge").textContent = "1";
  $("#approveButton").addEventListener("click", () => approveAction());
  $("#rejectButton").addEventListener("click", rejectAction);
}

function runWorkflow() {
  if (!appState.workflow || appState.running) return;
  appState.running = true;
  appState.events = [];
  appState.approvalPending = false;
  appState.approved = false;
  const startedAt = new Date();
  const localDate = [startedAt.getFullYear(), String(startedAt.getMonth() + 1).padStart(2, "0"), String(startedAt.getDate()).padStart(2, "0")].join("");
  appState.runId = `SF-${localDate}-${String(Date.now()).slice(-4)}`;
  $("#eventStream").innerHTML = "";
  $("#runDot").classList.add("is-running");
  $("#runStateText").textContent = "Agents working";
  setPhase("plan");
  setView("room");

  const w = appState.workflow;
  const analysisAgents = w.agents.filter(agent => !["approval", "output", "learning"].includes(agent[3]));
  const messages = [
    `Request structured: “${w.goal}”`,
    `Connected ${w.data.length || 0} available data source${w.data.length === 1 ? "" : "s"} and checked readiness.`,
    `Analysis complete. The strongest action supports: ${w.metric.replace(/[.!?]+$/, "").toLowerCase()}.`,
    `Plan prepared with limits and an evidence trail for human review.`
  ];

  analysisAgents.forEach((agent, index) => {
    setTimeout(() => {
      pushEvent(agent[1], agent[0], messages[Math.min(index, messages.length - 1)]);
      if (index >= 1) setPhase("review");
    }, 500 + index * 750);
  });

  setTimeout(() => {
    const gate = w.agents.find(agent => agent[3] === "approval");
    if (w.permission === "recommend") {
      pushEvent(gate[1], gate[0], "Recommendation delivered. This permission level does not allow execution.", "risk");
      setPhase("improve");
      pushEvent("Learning Agent", "LR", "Recommendation recorded so the next run can improve without taking action.", "learning");
      appState.running = false;
      $("#runDot").classList.remove("is-running");
      $("#runStateText").textContent = "Recommendation complete; no action taken";
      saveRun("Recommendation only", "No execution");
      showToast("Recommendation complete. No action was performed.");
      return;
    }
    if (w.permission === "automatic") {
      pushEvent(gate[1], gate[0], "The simulated action is inside the defined low-risk limit. Automatic execution is allowed.", "risk");
      appState.running = false;
      appState.approved = true;
      setTimeout(() => approveAction("Automatic within limits"), 500);
      return;
    }
    pushEvent(gate[1], gate[0], "Action is ready. Execution is paused until an authorized person decides.", "risk");
    appState.approvalPending = true;
    appState.running = false;
    $("#runDot").classList.remove("is-running");
    $("#runStateText").textContent = "Waiting for approval";
    setPhase("approve");
    renderApproval();
    showToast("A decision is waiting in the approval inbox.");
  }, 700 + analysisAgents.length * 800);
}

function approveAction(decision = "Approved") {
  appState.approvalPending = false;
  appState.approved = true;
  renderApproval();
  setView("room");
  $("#runDot").classList.add("is-running");
  $("#runStateText").textContent = "Executing approved action";
  setPhase("execute");
  const outputs = appState.workflow.agents.filter(agent => agent[3] === "output");
  outputs.forEach((agent, index) => setTimeout(() => {
    if (index === outputs.length - 1) setPhase("verify");
    pushEvent(agent[1], agent[0], index === outputs.length - 1 ? `Result verified against: ${appState.workflow.metric.replace(/[.!?]+$/, "")}.` : "Approved action completed and recorded in the shared room.", "complete");
    if (index === outputs.length - 1) {
      setTimeout(() => {
        setPhase("improve");
        pushEvent("Learning Agent", "LR", "Next-run improvement prepared from the verified result: compare forecast error and adjust only the weakest assumption.", "learning");
        $("#runDot").classList.remove("is-running");
        $("#runStateText").textContent = "Verified; improvement ready";
        saveWorkflow();
        saveRun(decision, "Verified");
        showToast("Workflow verified and an improvement was prepared.");
      }, 850);
    }
  }, 500 + index * 900));
}

function rejectAction() {
  appState.approvalPending = false;
  renderApproval();
  pushEvent("Approval Agent", "NO", "The proposed action was rejected. No execution occurred.", "risk");
  $("#runStateText").textContent = "Stopped by owner";
  saveRun("Rejected", "Stopped safely");
  setView("room");
  showToast("Action rejected. Nothing was executed.");
}

function resetDemo() {
  appState.workflow = null;
  appState.running = false;
  appState.approvalPending = false;
  appState.events = [];
  appState.runId = null;
  $("#emptyState").hidden = false;
  $("#generatedFlow").hidden = true;
  $("#runTopButton").disabled = true;
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
$("#workflowForm").addEventListener("submit", event => {
  event.preventDefault();
  appState.workflow = buildWorkflow(event.currentTarget);
  renderWorkflow(appState.workflow);
  showToast("Workflow generated. Review the handoffs before activation.");
});
$("#approval").addEventListener("change", event => {
  $("#controlNote").textContent = permissionNote(event.target.value);
});
$("#activateButton").addEventListener("click", runWorkflow);
$("#runTopButton").addEventListener("click", runWorkflow);
$("#resetButton").addEventListener("click", resetDemo);
$("#newWorkflowButton").addEventListener("click", () => setView("builder"));

renderLibrary();
renderHistory();
updateEvidence();
