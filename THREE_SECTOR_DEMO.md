# Three-sector SwitchFlow demo

SwitchFlow uses one pattern across three sectors: a person and AI agents share a
Switch room, specialists hand off evidence, a person approves a proposed action,
and a verifier reports what actually happened. Each example uses fictional data.

## Common setup

1. Start SwitchFlow and confirm its engine and Switch server show **Running**.
2. Sign in under **Connections** and choose a connected chat app and channel.
3. In the workflow library, choose one of the three **Demo brief** cards and
   download its sample data. Upload that file under **Data & schedules** and
   select it in the business brief. Deselect files from other examples.
4. Flip the switch, review the generated agents, then choose **Create agents & run**.
5. Use a separate Switch room or channel for each example. Keep the room's agent
   handoffs and the person's approval visible while recording the demo.

Generating a brief does not create agents. Creating a team registers its agents
and posts in the selected Switch room. Only do this with a channel you control.

## 1. Restaurant: tomorrow's demand

- **Problem:** The manager must plan ingredients while avoiding shortages and
  waste. Sample: `dist/examples/restaurant-demand-demo.csv`.
- **Trigger:** Daily at 18:00 local time, or start a run manually for the demo.
- **Handoffs:** Architect frames the next-day plan; demand and stock specialists
  check the selected rows; analyst prepares quantities, assumptions, and risks;
  manager approves; operator records an approved plan or exact local CSV edit;
  verifier checks the evidence.
- **Show as evidence:** A proposal tied to source rows, a human approval event,
  and a verifier result in the Switch room.
- **Limit:** A supplier purchase is not connected. A proposed order is a plan.

## 2. Software team: production bug triage

- **Problem:** Checkout failures begin after a release. Sample:
  `dist/examples/developer-incident-demo.txt`.
- **Trigger:** A developer starts a manual run and posts the incident request.
- **Handoffs:** Architect states impact and scope; reproduction specialist
  separates log facts from hypotheses and writes a minimal test plan; analyst
  proposes a fix or rollback decision with risks; developer approves the next
  action; operator prepares the approved action plan; verifier checks that the
  report matches the supplied evidence.
- **Show as evidence:** Specific log lines, reproduction steps, the developer's
  approval, and a verification checklist in the Switch room.
- **Limit:** The bundled agent runner is read-only. It does not commit code,
  merge a pull request, or deploy a release.

## 3. Retail store: stock replenishment

- **Problem:** Some products risk stock-outs while others sit unsold. Sample:
  `dist/examples/retail-inventory-demo.csv`.
- **Trigger:** Daily at 17:00 local time, or start a run manually for the demo.
- **Handoffs:** Architect defines the inventory review; demand and stock
  specialists calculate coverage from weekly sales, stock, reorder points, and
  lead time; analyst prepares a purchase proposal and spend estimate; owner
  approves; operator records the approved plan or exact local CSV edit;
  verifier checks the quantities and approval record.
- **Show as evidence:** Item-level calculations, approval, and an explicit
  result in the Switch room.
- **Limit:** No supplier integration exists, so no purchase order is sent.

## Demo verification

For each sector, check that the selected file belongs to that brief, a person
participates in the room, the analyst asks for approval before the operator
acts, and the verifier cites the current run's evidence. A demo is incomplete
if it only displays a generated team without a room handoff and result.

The hackathon asks for a real task completed by a person and an AI agent in a
team chat through Switch. Its judging criteria also include reproducibility and
clear presentation: https://www.wemakedevs.org/hackathons/switch
