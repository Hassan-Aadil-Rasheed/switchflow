import { spawn } from "node:child_process";
import { config, projectDirectory } from "./config.js";

const MAX_CONTEXT_CHARACTERS = 18_000;

function boundedJson(value) {
  const text = JSON.stringify(value, null, 2);
  return text.length <= MAX_CONTEXT_CHARACTERS
    ? text
    : `[older room evidence omitted; newest evidence follows]\n${text.slice(-MAX_CONTEXT_CHARACTERS)}`;
}

export function prepareRoomEvidence(roomMetadata, conversation, runId = null) {
  const entries = [];
  for (const thread of conversation?.threads ?? []) {
    if (thread?.root) entries.push(thread.root);
    for (const reply of thread?.replies ?? []) entries.push(reply);
  }
  entries.sort((left, right) => (left.timestamp ?? 0) - (right.timestamp ?? 0));
  const marker=runId?entries.findLastIndex(entry=>String(entry.body||'').includes(`SCHEDULED RUN START (${runId})`)):-1;
  const runEntries=runId?(marker>=0?entries.slice(marker):[]):entries;
  const recentMessages = runEntries.slice(-50).map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    sender: entry.sender,
    sender_name: entry.sender_name,
    body: String(entry.body ?? "").slice(0, 4_000),
    timestamp: entry.timestamp,
  }));
  return {
    recent_messages: recentMessages,
    older_history_exists: conversation?.truncated === true,
    current_run_marker_missing:runId!==null&&marker<0,
    room_metadata: roomMetadata,
  };
}

export function buildPrompt(role, message, roomContext, approvalEvent = false) {
  return `${role.instructions}

You are replying as @${role.name} inside a Switch room. Output only the message to post in that room—no preamble, no JSON, and no markdown code fence.

${approvalEvent ? "HUMAN APPROVAL EVENT: The exact configured phrase was posted by a non-agent participant.\n" : ""}Triggering message:
- sender: ${message.senderName}
- body: ${message.body}
- addressed to you: ${message.addressed}

Switch room context and evidence:
${boundedJson(roomContext)}
`;
}

export async function runCodex(role, prompt) {
  const args = [
    "exec",
    "-",
    "--ephemeral",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--color",
    "never",
    "--cd",
    projectDirectory,
  ];
  if (config.codexModel) args.push("--model", config.codexModel);

  return new Promise((resolve, reject) => {
    const child = spawn("codex", args, {
      cwd: projectDirectory,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill(), 180_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Codex exited with ${code}: ${stderr.slice(-1500)}`));
        return;
      }
      const answer = stdout.trim();
      if (!answer) {
        reject(new Error(`Codex returned an empty response: ${stderr.slice(-1000)}`));
        return;
      }
      resolve(answer);
    });
    child.stdin.end(prompt);
  });
}

