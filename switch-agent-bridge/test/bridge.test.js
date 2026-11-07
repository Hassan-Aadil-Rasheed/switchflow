import test from "node:test";
import assert from "node:assert/strict";
import http from 'node:http';
import { buildPrompt, prepareRoomEvidence } from "../src/codex-runner.js";
import { messageFromFrame, SwitchApi } from "../src/switch-api.js";

test("extracts a Switch room message frame", () => {
  const result = messageFromFrame({
    event: "message",
    id: 42,
    data: {
      room_id: "room-1",
      payload: {
        message_id: "message-1",
        sender_name: "Admin",
        body: "Reduce waste",
        addressed: true,
        sender_kind: 'user',
        attachments: [{filename:'schedule.csv',size:20,mxc:'mxc://example/file'}],
      },
    },
  });
  assert.equal(result.roomId, "room-1");
  assert.equal(result.senderName, "Admin");
  assert.equal(result.addressed, true);
  assert.equal(result.senderType, 'user');
  assert.equal(result.attachments[0].filename, 'schedule.csv');
});

test('downloads Switch media with the agent key and enforces the file limit',async()=>{
  let authorized=false;
  const server=http.createServer((request,response)=>{
    authorized=request.headers.authorization==='Bearer test-key'&&request.url.includes('mxc%3A%2F%2F');
    response.writeHead(200,{'content-type':'text/csv'});
    response.end('date,covers\n2026-11-05,23\n');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const api=new SwitchApi(`http://127.0.0.1:${server.address().port}`);
    const agent={id:'agent-1',apiKey:'test-key'};
    const bytes=await api.downloadMedia(agent,'room-1','mxc://example/file');
    assert.equal(bytes.toString(),'date,covers\n2026-11-05,23\n');
    assert.equal(authorized,true);
    await assert.rejects(api.downloadMedia(agent,'room-1','mxc://example/file',5),/1 MB or smaller/);
  }finally{server.close();}
});

test("marks human approval in the Codex prompt", () => {
  const role = { name: "switchflow-analyst", instructions: "Review safely." };
  const prompt = buildPrompt(
    role,
    { senderName: "Admin", body: "APPROVE", addressed: false },
    { messages: [] },
    true,
  );
  assert.match(prompt, /HUMAN APPROVAL EVENT/);
  assert.match(prompt, /sender: Admin/);
});

test("preserves the newest approval evidence from Switch room history", () => {
  const evidence = prepareRoomEvidence(
    { description: "demo room" },
    {
      truncated: true,
      threads: [
        {
          root: { id: "packet", sender_name: "SwitchFlow Analyst", body: "APPROVAL PACKET: simulated order", timestamp: 10 },
          replies: [{ id: "approval", sender_name: "user", body: "APPROVE", timestamp: 20 }],
        },
      ],
    },
  );
  assert.equal(evidence.recent_messages.at(-1).body, "APPROVE");
  assert.equal(evidence.recent_messages.at(-1).sender_name, "user");
  assert.equal(evidence.older_history_exists, true);
});

test('a scheduled run does not reuse approval from the previous run',()=>{
  const evidence=prepareRoomEvidence({}, {threads:[
    {root:{id:'old',body:'APPROVE',timestamp:1},replies:[]},
    {root:{id:'new',body:'SCHEDULED RUN START (run-2)',timestamp:2},replies:[{id:'new-data',body:'Current stock is 4',timestamp:3}]},
  ]},'run-2');
  assert.deepEqual(evidence.recent_messages.map(item=>item.id),['new','new-data']);
  assert.equal(evidence.current_run_marker_missing,false);
});

