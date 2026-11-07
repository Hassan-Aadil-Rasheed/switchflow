# SwitchFlow Desktop 0.3.36

Describe a business goal, review the AI-designed specialist team, then confirm
**Create agents & run**. Agents are registered under the signed-in Switch user
and appear in Switch Console's **Your Agents**, as well as the app's Connections
page. The team is restored from private local data after backend restart.

Windows Electron application with a local interface and agent
bridge. It bundles its JavaScript runtime and ws dependency; Switch
Console, and the Codex CLI still need to be installed separately.
Docker is required for local Mattermost chat but not for the native Switch server.

## Build and run

Run `npm install`, `npm run desktop:check`, then `npm run desktop:build` from
the project root. Output: `desktop-release/SwitchFlow Setup 0.3.36.exe`.
Use `npm run desktop` for development.

The installed app starts its own backend when nothing is listening on port
8787, and automatically opens Switch Console when its local Switch server is
offline. It reuses an already-running backend and does not stop a backend owned
by another process. Closing the app stops only the child process it started.
Docker remains on demand. Switch Console may take a moment to bring its local
server online; the bridge reconnects automatically and the status screen shows
when the server and agents are ready.

## Existing laptop setup

Choose **Import existing agent setup** and select your local
`switch-agent-bridge/state.json`. The app copies it into its own user-data
directory, never into the installer. Keep this file private: it contains agent
API keys. Development mode imports the workspace state automatically.

Sign in with your Switch account from Connections inside the application. The
desktop app saves the Switch session using Windows encryption and restores it
after restart. Switch sessions last 24 hours and are refreshed while the app
and Switch are running. Sign out of SwitchFlow from Connections to remove the
saved session. Switch Console keeps its own sign-in; it does not provide a
session handoff to third-party desktop applications.
Flow builder lists your active Switch chat connections. Choose the app and,
for Telegram, enter the existing group ID before generating the agent team.
SwitchFlow remembers the chosen app and each app's chat ID for that Switch
account. It validates the destination before creating agents or starting a run.
Internet remains required for cloud AI and chat platforms.

## Business data and schedules

Sign in, then open **Data & schedules** to upload CSV, JSON, or TXT files of up
to 1 MB. The owner can view all supported files, edit CSV cells, download the
current copy, and select up to five files for a workflow. Files belong to the
signed-in Switch account and are stored in the app's private local data folder.
When SwitchFlow and Switch are open, a person in a workflow room can also send a
CSV, JSON, or TXT attachment through its connected chat app. SwitchFlow imports
supported files up to 1 MB into Data & schedules and labels their chat source.
An imported file does not enter a workflow until selected in Flow builder.
On startup, SwitchFlow checks the latest 50 room messages for files sent while
the app was closed. Older attachments must be sent again or uploaded in the app.
CSV edits retain the previous version. Agent planning and each run receive a
bounded preview of the selected file versions. Large files and external system
sync are not supported.

Daily workflow schedules are also visible and editable in this screen. A due
run starts with the latest file versions after the previous run finishes. The
desktop app, its backend, and Switch must be open at the due time; the app does
not run as a background Windows service. Every new run requires a fresh human
approval. If an Analyst includes a valid exact CSV cell proposal, approving in
the app records the decision and applies that cell edit, then posts evidence in
the Switch room. Use **View agent activity** to read that room from SwitchFlow
after restarting the app. Without a valid CSV proposal, execution remains a plan or
simulation. Purchases and payments require separate connected services. The
shared-group order flow below can post an owner-approved decision to customers.

## Shared-group customer orders

Connect an existing Telegram group in Flow builder. Upload a CSV containing
`item,capacity,committed` columns, with one row per product, and select it for
the workflow. `capacity` is the maximum units the business can produce for the
period represented by the sheet; `committed` is already reserved units. The
business owner must maintain these figures, including labor, ingredients,
equipment, and other constraints. A customer in the group addresses the
Architect agent with a request such as `@agent I want 1000 cookies for Friday`.
SwitchFlow tracks one pending order per team. Agents review the request and
the selected business data. The approval card shows the capacity CSV result;
acceptance is disabled unless `capacity - committed` covers the requested
quantity. The signed-in owner can accept or decline. Acceptance increments the
CSV's committed amount and posts a response in the customer's group thread;
decline posts the decision without changing the CSV. This is a group response,
not a private Telegram message. Orders without a matching capacity row cannot
be accepted until the business data is updated and the request is reviewed
again. Other order types and simultaneous pending orders are not supported yet.

The installer is unsigned. Code signing and automatic updates are not included.
