import fs from "node:fs";
import { config, getRegistrationToken, statePath, validateName, writeState } from "./config.js";
import { roles } from "./roles.js";
import { SwitchApi } from "./switch-api.js";

async function main() {
  validateName(config.prefix, "SWITCHFLOW_PREFIX");
  validateName(config.roomName, "SWITCHFLOW_ROOM_NAME");
  const registrationToken = getRegistrationToken();
  if (!registrationToken) throw new Error("No Switch agent-registration token was found.");
  if (fs.existsSync(statePath)) {
    throw new Error(`State already exists at ${statePath}. Remove it only if you intentionally want to register a new set of agent keys.`);
  }

  const api = new SwitchApi(config.baseUrl);
  await api.health();
  console.log(`Switch is healthy at ${config.baseUrl}`);

  const agents = {};
  for (const role of roles) {
    const registered = await api.register(role, registrationToken);
    agents[role.key] = {
      id: registered.id,
      apiKey: registered.api_key,
      name: role.name,
      displayName: role.displayName,
    };
    console.log(`Registered ${role.displayName} as @${role.name}`);
  }

  // Switch prevents an agent from editing its own permissions. Same-owner
  // agents can configure one another, so the Architect configures its three
  // teammates and the Analyst configures the Architect.
  for (const key of ["analyst", "operator", "verifier"]) {
    await api.operation(agents.architect, "update_agent_detail", {
      agent_id: agents[key].id,
      addressing: "owner_and_owner_agents",
    });
  }
  await api.operation(agents.analyst, "update_agent_detail", {
    agent_id: agents.architect.id,
    addressing: "owner_and_owner_agents",
  });

  const architect = agents.architect;
  let bridgeId = config.bridgeId;
  if (!bridgeId) {
    const result = await api.operation(architect, "list_bridges", {});
    const bridges = Array.isArray(result) ? result : (result?.bridges ?? []);
    const mattermost = bridges.find((bridge) => bridge.type === "mattermost");
    if (!mattermost) throw new Error("No Mattermost bridge was found. Connect Mattermost in Switch Console first.");
    bridgeId = mattermost.id;
  }

  const room = await api.operation(architect, "create_room", {
    name: config.roomName,
    description: `SwitchFlow demo for a ${config.business} business: ${config.goal}`,
    agent_names: roles.map((role) => role.name),
    bridge_id: bridgeId,
    channel_type: "channel_public",
  });

  const state = {
    createdAt: new Date().toISOString(),
    baseUrl: config.baseUrl,
    bridgeId,
    room: { id: room.id, name: config.roomName },
    agents,
  };
  writeState(state);

  await api.postMessage(
    architect,
    room.id,
    `SwitchFlow is ready. Four real agents are connected to this room:\n- @${agents.architect.name} — workflow design\n- @${agents.analyst.name} — analysis and risk\n- @${agents.operator.name} — approved simulated execution\n- @${agents.verifier.name} — independent verification\n\nGoal: ${config.goal}\nHuman approval phrase: ${config.approvalPhrase}\n\n@${agents.architect.name}, ask the room owner for the first business request and available data.`,
  );

  console.log(`Created Switch room ${config.roomName} (${room.id})`);
  console.log(`Saved agent credentials to ${statePath}`);
  console.log("Run npm start and keep this terminal open during the demo.");
}

main().catch((error) => {
  console.error(`Setup failed: ${error.message}`);
  process.exitCode = 1;
});

