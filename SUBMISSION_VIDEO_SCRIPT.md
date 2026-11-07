# SwitchFlow: 8–9 minute submission video script

**Target runtime:** 8 minutes 40 seconds, including pauses for screen changes.  
**Format:** Screen recording with voiceover.  
**Main live example:** Restaurant demand planning. Show software, retail, and customer order workflows to explain the range of the product.

## Prepare the recording

1. Start SwitchFlow. Confirm the engine and Switch server show **Running**. Sign in under **Connections** and connect the chat app and room you will show.
2. Upload `dist/examples/restaurant-demand-demo.csv`, `dist/examples/developer-incident-demo.txt`, and `dist/examples/retail-inventory-demo.csv` in **Data & schedules**. Select only the matching file for each workflow.
3. Start the restaurant run manually while recording, even though its normal schedule is 18:00 local time. Keep the Switch room open in a second window.
4. If showing customer orders, also upload `dist/examples/restaurant-customer-orders-demo.csv`, choose **Customers in the connected chat group**, and use a separate team or room. This is a separate capacity-based workflow.
5. Use real approval, Operator, and Verifier messages from a completed run. Hide passwords, API keys, tokens, private room IDs, and personal account details.

## 0:00–0:40 — Introduction and problem

**On screen:** SwitchFlow title, Business overview, and three sector cards.

**Say:** “Hi, this is SwitchFlow. Small businesses and teams make repeated decisions from sales files, inventory tables, incident logs, and chat messages. The hard part is moving from a recommendation to a decision someone can review and verify. SwitchFlow lets a person describe the task, assembles an AI team in Switch, keeps the work in a shared room, and requires a human decision before an approved action is recorded. I will show one complete restaurant run, then the software and retail examples.”

## 0:40–1:25 — What SwitchFlow is

**On screen:** Business overview setup route: Connect, Add data, Describe, Choose agents, Switch on. Briefly point to the sidebar.

**Say:** “The app guides the owner through five steps. First, connect a Switch account and a messaging app. Second, add the business data. Third, describe the goal, trigger, and success measure. Fourth, optionally reuse existing agents. Finally, review the generated workflow and switch it on. The sidebar gives us Chats, Data & schedules, Flow builder, the Agent room, Approvals, the Workflow library, and Run history. SwitchFlow is the workflow interface; Switch supplies the shared room and agent identities where the handoffs happen.”

## 1:25–2:10 — Connections and data

**On screen:** Connections page, connected app status, Data & schedules, and the restaurant CSV preview. Avoid showing credentials.

**Say:** “In Connections, I sign in to Switch, choose the AI connection, and select the chat app where the team will work. SwitchFlow supports connected messaging destinations such as Mattermost, Telegram, Discord, Slack, and Microsoft Teams, depending on the account setup. In Data & schedules, I can upload CSV, JSON, or TXT files. The uploaded files are available to the owner, but I explicitly select which files each workflow may use. Here is the restaurant sample: each row shows a menu item, average daily sales, stock on hand, supplier lead time, unit cost, and days until expiry.”

## 2:10–3:10 — Build the restaurant workflow

**On screen:** Open **Tomorrow's demand** in Workflow library; show Flow builder fields and selected restaurant file. Show **Daily**, **18:00**, and **Ask before acting**. Click **Generate my workflow**, then show the preview.

**Say:** “The first example is tomorrow's demand for a restaurant. The manager wants enough ingredients for the next day without avoidable waste. I select Restaurant or café, describe that goal, choose the restaurant CSV, and set the workflow to run daily at 6 p.m. local time. I choose ‘Ask before acting’ because a manager must review the proposal. The success measure asks for quantities, source rows, assumptions, and shortage or waste risks. ‘Generate my workflow’ gives me a preview of the agents, their handoffs, the approval gate, and the expected result. This preview alone has not created agents yet.”

## 3:10–4:35 — Live Switch room handoffs

**On screen:** Click **Create agents & run**. Switch to the live room. Show the Architect, specialists, and Analyst messages. Pause and zoom on source-row references and calculations.

**Say:** “Now I confirm ‘Create agents & run.’ SwitchFlow registers the team and starts a real run in the selected Switch room. The Architect frames the next-day question and identifies the evidence to inspect. Demand and stock specialists review the selected rows. The Analyst brings that work together into proposed quantities, assumptions, and risks. Notice that the proposal cites the source file. A manager can trace a recommendation back to the sales and stock numbers instead of accepting an unexplained number. If a required fact is missing, the team should state that gap rather than invent it.”

**Recording cue:** Allow 10–15 seconds to show the actual messages. Read one genuine item-level recommendation from your run; do not script a quantity before seeing the output.

## 4:35–5:30 — Human approval and verification

**On screen:** Show the approval packet and your actual approval event. Show the Operator's record and Verifier's result in the same room. Briefly open Approvals and Run history if populated.

**Say:** “This is the control point. The Analyst asks for approval, and the manager reviews the source rows, quantities, cost, and risks. I approve the next step as a person. Only after that decision does the Operator record the approved plan or apply an exact local CSV cell edit, if one was proposed and approved. Then the Verifier checks the result against the evidence and the approval. The room preserves the proposal, the human decision, the execution record, and an explicit verification result. The Approvals screen collects pending decisions, and Run history lets the owner revisit completed runs. This demo does not place a real supplier purchase.”

## 5:30–6:20 — Software incident workflow

**On screen:** Workflow library → **Production bug triage**; show `developer-incident-demo.txt`, then the manual trigger and workflow preview. If available, show a completed software room result.

**Say:** “The same pattern works for a software team. The sample incident says checkout requests began returning HTTP 500 after release 2.14.0. It reports seven failures in forty attempts and includes specific request IDs and timestamps. A developer starts this workflow manually. The Architect defines impact and scope. A reproduction specialist separates log facts from hypotheses and writes a minimal test plan. The Analyst recommends a fix or rollback decision with risks, and a developer approves the next action. The Operator prepares the approved action plan, while the Verifier checks that the report matches the supplied log. The runner is read-only: it does not commit code, merge a pull request, or deploy.”

## 6:20–7:05 — Retail replenishment workflow

**On screen:** Workflow library → **Stock replenishment**; show `retail-inventory-demo.csv`, its columns, and a couple of rows. Show the daily 17:00 schedule and approval setting.

**Say:** “The retail example looks for both stock-out risk and items sitting unsold. Its CSV has weekly sales, stock on hand, reorder points, lead times, and unit costs. The daily schedule is 5 p.m. local time, though I can run it manually for a demo. Demand and stock specialists calculate coverage for each item. The Analyst proposes replenishment quantities and an estimated spend. The owner approves before the Operator records a plan or an exact local CSV edit, and the Verifier checks the quantities and approval. There is no supplier integration here, so a purchase proposal is not a sent purchase order.”

## 7:05–7:50 — Customer requests and Chats

**On screen:** Chats page, Help page, and `restaurant-customer-orders-demo.csv`. If configured, show one actual customer message, approval, and reply. Otherwise show the setup without claiming a live order occurred.

**Say:** “SwitchFlow also has a customer-request mode for a connected group. A customer can ask for a listed item, such as ‘I want two butter croissants.’ The team checks a selected capacity CSV with item, capacity, and committed columns. Available capacity is capacity minus what is already committed. The owner accepts or declines in Approvals. On acceptance, SwitchFlow reserves that quantity in the local CSV and posts the decision in the customer thread. The Chats page lets the owner follow connected conversations. This flow handles one pending request per team and one item per message. Payment and delivery are not connected.”

## 7:50–8:30 — Architecture, boundaries, and close

**On screen:** Return to the Switch room evidence, then a closing slide: Business data → agents → human approval → recorded result → verifier.

**Say:** “Under the hood, the desktop app and local bridge connect to Switch. Switch provides the room, identities, and message routing; SwitchFlow supplies the business brief, selected data, scheduling, approval interface, and run history. Daily runs happen while SwitchFlow and Switch are open, and each new run needs a fresh human approval. The result is a repeatable pattern across different kinds of work: evidence enters the room, specialists examine it, a person makes the decision, and a verifier reports what happened. That is SwitchFlow.”

## Timing and editing notes

- Rehearse at a steady pace with short pauses while the UI changes. Trim or extend the pauses to land between **8:00 and 9:00**.
- Spend the most screen time on a real Switch room handoff, approval, and verifier message. Those provide stronger evidence than a static workflow preview.
- Replace general descriptions with the actual item, log line, quantity, decision, and verifier status visible in your run.
- If a connected app or customer order flow is not configured, describe its supported path; do not present it as a completed live transaction.
- If the live result is **PARTIAL** or **CANNOT VERIFY**, show it honestly and explain the missing evidence.
