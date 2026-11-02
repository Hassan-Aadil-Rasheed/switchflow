# Run SwitchFlow in Switch

SwitchFlow's website is a companion workflow designer. The real hackathon
workflow runs inside a Switch room using `switch/switchflow.template.yaml`.

## Prerequisites

1. Install Docker Desktop and start it.
2. Install Switch Console for Windows from the official Switch repository.
3. Open Switch Console and confirm that Codex shows **Signed in** under
   **Settings > Agent providers**.
4. Choose **Run a server on this computer**. Switch starts its local server in
   Docker and includes Mattermost for the demo.

## Create the workflow

1. In Switch Console, open **Templates** and import
   `switch/switchflow.template.yaml`.
2. Choose a workflow name, business type, business goal, success measure, and
   Mattermost as the bridge.
3. Keep Codex as the provider and the local machine as the location.
4. Create the four agents and the room.
5. Open the generated Mattermost room.

## Demo

1. Give the Architect a real business request and sample data.
2. Watch the Architect hand the plan to the Analyst.
3. Review the Analyst's approval packet.
4. Post the exact word `APPROVE` as the person in the room.
5. Watch the Operator perform the approved simulated action.
6. Watch the Verifier independently report VERIFIED, PARTIAL, FAILED, or
   CANNOT VERIFY.

The approval message, agent handoffs, execution record, and verification all
remain in the Switch room. Without Switch, the workflow loses its shared state,
identity-aware approval, and agent-to-agent routing.
