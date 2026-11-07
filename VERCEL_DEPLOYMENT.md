# Vercel deployment

Deploy from this directory with `npx vercel --prod` after signing in.
The website output is `dist`. `.vercelignore` excludes all local agent keys,
Switch state, logs, and dependencies.

This deployment publishes the workflow designer and Connections interface.
Cloud API endpoints return an explicit unavailable response until a hosted
backend is configured. They do not fake execution or record approvals.

The current backend runs Codex subprocesses using a local signed-in CLI,
stores human sessions in process memory, and connects to Switch on Windows
localhost. Hosting it requires a separate server and deployment work; simply
uploading it as a Vercel Function does not reproduce that environment.

Keep using http://127.0.0.1:8787 for live workflows while preparing the hosted
backend. Do not expose the current local server publicly as-is: its local
host restrictions and session model are designed for one laptop.
