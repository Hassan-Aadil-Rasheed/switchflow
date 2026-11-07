# SwitchFlow

SwitchFlow is a Windows desktop app for running business workflows with agents in Switch. An owner describes a goal, selects business files and a connected chat destination, reviews the generated agent team, and starts a real Switch room. Specialists examine the selected evidence, an analyst prepares a proposal, the owner decides in Approvals, and a verifier reports the result.

The included demos cover restaurant demand planning, retail replenishment, software incident triage, and customer orders in a connected group. In the order flow, the owner can accept or decline a request. Acceptance reserves capacity in the selected local CSV and replies in the original customer thread. Purchases, payments, manufacturing, and delivery are not connected.

## Requirements

- Windows 10 or 11 and Node.js 22 or newer
- Switch Console with its local server running
- A Switch account and a connected chat app or room
- A signed-in Codex CLI, or an AI connection configured in SwitchFlow
- Docker Desktop only if using local Mattermost

## Run locally

```powershell
git clone https://github.com/Hassan-Aadil-Rasheed/switchflow.git
cd switchflow
npm install
cd switch-agent-bridge
npm install
cd ..
npm run desktop
```

The app opens a local backend at `http://127.0.0.1:8787`. In **Connections**, sign in to Switch and connect the chat destination. Upload a sample file from `dist/examples` in **Data & schedules**. In **Flow builder**, describe a goal, select that file and destination, generate the team, review it, and choose **Create agents & run**. Watch the handoffs in **Agent room** and make any decision in **Approvals**.

For a customer order demo, select `dist/examples/restaurant-customer-orders-demo.csv` and the customer group workflow. Have a customer message the intake agent in that connected group. The owner sees the request in **Approvals**. A feasible capacity row enables acceptance; the owner should check fulfillment time, recipe, usable stock, staff, equipment, and other commitments before accepting.

## Build and test

```powershell
npm run desktop:check
npm run desktop:build
cd switch-agent-bridge
npm run check
```

The installer is generated in `desktop-release/` and is not committed. Local credentials, uploaded business files, sessions, and logs are also excluded from Git. See [desktop/README.md](desktop/README.md) and [switch-agent-bridge/README.md](switch-agent-bridge/README.md) for detailed setup and architecture.
