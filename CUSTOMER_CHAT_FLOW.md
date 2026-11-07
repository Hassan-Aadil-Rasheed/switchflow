# Customer → agents → business owner → customer

1. Owner connects a supported messaging app in SwitchFlow and selects a group or channel.
2. Owner uploads a capacity CSV (`item,capacity,committed`), describes the business, selects **Customers in the connected chat group**, and creates the team.
3. Customer mentions the team's intake agent: `@intake-agent I want 100 cookies for tomorrow.` Use the actual agent handle shown in Connections.
4. Intake acknowledges receipt with a request reference. Receipt does not accept the order.
5. Specialists inspect the selected file. Available capacity = capacity minus committed. The analyst supplies a matching capacity assessment; missing evidence blocks acceptance.
6. Owner opens SwitchFlow → Approvals, reviews the request and evidence, then accepts or declines.
7. Acceptance reserves the quantity in the local CSV. SwitchFlow posts the owner's decision in the original customer thread. If delivery fails, the decision remains retryable and the reservation is not applied twice.
8. The saved order records its reference, customer message, assessment, owner decision, and reply. Connections → Open requests & results reopens its room history after restarting the app.

This version processes one request at a time per team. While one is waiting, another customer receives an explicit busy reply and must resend after the decision. Requests are not silently accepted or queued. Stock reservation is real within the selected local CSV; payment, manufacturing, delivery, and supplier purchasing are not connected.

The laptop, SwitchFlow engine, Switch server, and selected messaging bridge must remain running. Each chat platform requires its own configured bot or app credentials and permissions.
