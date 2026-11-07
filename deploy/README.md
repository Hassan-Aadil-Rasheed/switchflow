# SwitchFlow server deployment handoff

Status: prepared, not deployed. No SSH target or cloud account is configured
in the current workspace. The Vercel website is still frontend-only.

## Required access

- Linux VPS with Ubuntu 22.04/24.04, SSH public-key access and sudo.
- Official Switch documentation suggests starting with 2 vCPU, 4 GB RAM,
  and 20 GB disk; agent workloads may need more.
- A backend hostname pointing to the server and inbound HTTPS access.
- An agent-provider login performed on the server by its owner.

Never send passwords, private SSH keys, or AI provider tokens in chat.

## Deployment order

1. Follow the official self-host guide to deploy a version-pinned Switch
   Compose stack and PostgreSQL. Keep the database and Switch ports private.
   Enable the Gateway and optionally Mattermost. Keep generated secrets on
   the server, with backups.
2. Create the non-root Linux account `switchflow`. Install Node.js 22+ and
   the supported Codex CLI. Sign Codex in as this user; the laptop's login
   is not automatically available on the server.
3. Copy project source to `/opt/switchflow`, excluding `.git`, `.vercel`,
   `.openai`, local `.env`, node_modules, logs and `state.json`.
4. Install the bridge dependencies with `npm ci`. Create
   `/etc/switchflow/bridge.env` from the example, readable only by the service
   user. Use a Switch registration key owned by the intended signed-in user,
   rather than the deployment bootstrap account.
5. Run `npm run setup` as that user with the server environment loaded.
   Setup creates the four agents and initial room. Never rerun it with an
   existing state file; retain the new server-side state securely.
6. Verify `/usr/bin/node` and the Codex executable path in the service file.
   Install `switchflow.service`, reload systemd, enable and start the service.
7. Verify local `/api/status`, all four agent connections, and Codex login.
8. Configure HTTPS routing. `Caddyfile.example` is a starting point for the
   same-origin proxy setup below, not a complete production security policy.

## Vercel integration — do only after the backend works

Replace the temporary `api/[...path].js` unavailable handler with an external
Vercel rewrite from `/api/:path*` to
`https://YOUR_BACKEND_HOST/api/:path*`. Preserve `outputDirectory: dist`.
The browser then uses a single Vercel origin for its session and requests.
Do not put Switch credentials or agent API keys into frontend environment
variables or JavaScript. Validate forwarded cookies and streaming events.

Before public use, restrict the backend to the intended Vercel ingress, add
login rate limiting and request limits, use Secure session cookies over HTTPS,
and bind approval decisions to the specific run and packet. Current state and
sessions live in one process, so run a single bridge instance. Multi-user
concurrency and durable sessions need further work before production use.

## Acceptance checks

- Vercel Connections signs a real person into the hosted Switch Gateway.
- A configured chat app is shown from Switch's actual connection list.
- Starting a run creates its room and adds all four agents.
- An approval posted from Vercel appears as that person in room history.
- Operator and Verifier see both the packet and human decision.
- Events stream to Vercel and the result remains available in Switch.
- The workflow continues with the Windows laptop turned off.

## Official references

- https://docs.switchagents.ai/switch-rooms/deploy/self-host
- https://docs.switchagents.ai/switch-rooms/deploy/host-remotely
- https://docs.switchagents.ai/switch-rooms/internals/agent-protocol
