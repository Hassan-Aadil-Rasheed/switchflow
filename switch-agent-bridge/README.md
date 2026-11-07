# SwitchFlow Agent Bridge

## Business-specific teams (desktop 0.3)

Generate workflow now asks Codex for a business-specific team of four to seven
agents. It always includes coordination, risk/approval, simulated execution,
and verification, with up to three additional specialists. No agents are
registered during the preview. **Create agents & run** confirms the proposed
team, registers each agent with a temporary registration key owned by the
signed-in person, then revokes that registration key. Their agent API keys and
instructions are retained only in ignored `business-teams.json` next to the
local state file. The installer never includes that file.

Created agents appear under that account in Switch Console's Your Agents.
The backend restores their connections after restart. Each team has its own
room and sender rules. A Telegram room with an active workflow must finish or
be rejected before another workflow can use it. Selected uploaded CSV, JSON,
and TXT files provide bounded current data to planning and runs. A daily timer
starts the next run after the prior run completes while the desktop app and
Switch are open. CSV cell changes proposed by the Analyst can be approved and
applied inside SwitchFlow with a retained previous version. External purchases,
payments, and messages are not yet connected.

This Windows-compatible backend connects four real Switch identities to one
Switch room using the official agent protocol:

`Architect → Analyst/Risk → human APPROVE → Operator → Verifier`

Each agent listens over WebSocket, uses the existing signed-in Codex CLI for
its response, and posts its handoff back through Switch. Codex runs in
read-only, ephemeral mode. The Operator is instructed to perform only simulated
or reversible demo work.

## One-time setup

1. Keep Switch Console and its local server running.
2. Run the commands below. For the Windows local server, setup reads its
   existing registration credential in place and never prints or copies it.
   A remote server instead requires `SWITCH_REGISTRATION_TOKEN` in `.env`.

   ```powershell
   npm install
   npm run setup
   ```

Setup registers the four agents, creates the Mattermost-backed room, posts the
kickoff message, and stores the four per-agent credentials in ignored
`state.json`.

## Run the demo

```powershell
npm start
```

Keep the terminal open. In the generated Mattermost room, address the Architect
with a real business request. When the Analyst posts its approval packet, a
person must post the exact configured approval phrase (`APPROVE` by default).

The same process serves the connected website at `http://127.0.0.1:8787`.
Open **Connections** and sign in with your Switch account. The local relay
keeps the Switch session in memory, uses an HttpOnly cookie, and expires the
session after eight hours. Bot credentials are submitted directly to Switch
through the relay and are never written to the website's storage.

Connections loads supported app types and credential fields from Switch. It
can register chat apps using your app/bot credentials. Each run creates a new
room and adds the four existing registered agents. The first connected selected
app hosts the run; selection of more apps does not mirror one room to all apps.
Apps without channel creation support need an existing channel ID.

Approve and Reject now send a human message through your authenticated Switch
session. The website does not impersonate a human using an agent API key.
Switch must be running for sign-in and live operations. The website itself
remains available when Switch is offline and the agents retry their connections.

Never commit `.env` or `state.json`; they contain credentials.
