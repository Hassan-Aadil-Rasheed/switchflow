import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import localSwitch from './local-switch.cjs';

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
export const projectDirectory = path.resolve(sourceDirectory, "..");
export const statePath = process.env.SWITCHFLOW_STATE_PATH || path.join(projectDirectory, "state.json");
const switchConsoleEnvironmentPath = path.join(
  process.env.APPDATA ?? "",
  "switchdash",
  "local-switch-server",
  "native",
  "run",
  "switch-core.env",
);

function clean(value, fallback = "") {
  const result = value?.trim();
  return result || fallback;
}

export const config = Object.freeze({
  baseUrl: localSwitch.localSwitchUrl(),
  registrationToken: clean(process.env.SWITCH_REGISTRATION_TOKEN),
  prefix: clean(process.env.SWITCHFLOW_PREFIX, "switchflow-live").toLowerCase(),
  roomName: clean(process.env.SWITCHFLOW_ROOM_NAME, "switchflow-live-demo").toLowerCase(),
  business: clean(process.env.SWITCHFLOW_BUSINESS, "restaurant"),
  goal: clean(
    process.env.SWITCHFLOW_GOAL,
    "Reduce tomorrow's avoidable food waste without causing stock-outs.",
  ),
  successMetric: clean(
    process.env.SWITCHFLOW_SUCCESS_METRIC,
    "Produce an approved purchasing adjustment with clear evidence and verification.",
  ),
  approvalPhrase: clean(process.env.SWITCHFLOW_APPROVAL_PHRASE, "APPROVE"),
  bridgeId: clean(process.env.SWITCH_BRIDGE_ID),
  codexModel: clean(process.env.CODEX_MODEL),
  webPort: Number.parseInt(clean(process.env.SWITCHFLOW_WEB_PORT, "8787"), 10),
});

export function readState() {
  if (!fs.existsSync(statePath)) {
    throw new Error(`Missing ${statePath}. Run npm run setup first.`);
  }
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

export function writeState(state) {
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

export function getRegistrationToken() {
  if (config.registrationToken && config.registrationToken !== "paste-registration-key-here") {
    return config.registrationToken;
  }
  if (!process.env.APPDATA || !fs.existsSync(switchConsoleEnvironmentPath)) return "";
  const line = fs
    .readFileSync(switchConsoleEnvironmentPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith("AGENT_REGISTRATION_TOKEN="));
  return line?.slice("AGENT_REGISTRATION_TOKEN=".length).trim() ?? "";
}

export function validateName(name, label) {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
    throw new Error(`${label} must contain only lowercase letters, numbers, dots, underscores, or hyphens.`);
  }
}

