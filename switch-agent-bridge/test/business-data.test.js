import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {BusinessDataStore,parseCsv,csvText,extractFileProposal} from '../src/business-data.js';
import {scheduleFor,scheduleIsDue,localClock} from '../src/workflow-schedule.js';

test('keeps uploaded schedule files private, editable, versioned, and downloadable',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'switchflow-business-data-'));
  try {
    const store=new BusinessDataStore(directory);
    const original='Employee,Shift\n"Lee, A",Morning\nSam,Evening\n';
    const file=store.add('owner-a',{name:'schedule.csv',base64:Buffer.from(original).toString('base64')});
    assert.equal(store.list('owner-b').length,0);
    assert.throws(()=>store.content(file.id,'owner-b'),/not found/);
    const proposed=store.previewCellChange(file.id,'owner-a',{expectedVersion:1,row:2,column:'Shift',value:'Morning'});
    assert.equal(proposed.before,'Evening');
    const result=store.updateCell(file.id,'owner-a',{version:1,row:2,column:1,value:'Morning'});
    assert.equal(result.file.version,2);
    assert.equal(store.content(file.id,'owner-a').rows[2][1],'Morning');
    assert.equal(fs.readFileSync(path.join(directory,'business-data',`${file.id}.v1.csv`),'utf8'),original);
    assert.throws(()=>store.updateCell(file.id,'owner-a',{version:1,row:2,column:1,value:'Night'}),/changed/);
  } finally {fs.rmSync(directory,{recursive:true,force:true});}
});

test('CSV quoted cells round-trip and malformed row widths are rejected',()=>{
  const rows=[['Name','Note'],['A','Line 1\nLine 2'],['B','a,b "c"']];
  assert.deepEqual(parseCsv(csvText(rows)),rows);
  assert.throws(()=>parseCsv('A,B\n1\n'),/same number/);
});

test('daily schedule respects local time zone and fires once per local date',()=>{
  const schedule=scheduleFor({trigger:'Daily',scheduleTime:'18:00',timeZone:'Asia/Kolkata'});
  const before=new Date('2026-11-04T12:29:00Z');
  const after=new Date('2026-11-04T12:30:00Z');
  assert.equal(localClock(after,schedule.timeZone).time,'18:00');
  assert.equal(scheduleIsDue(schedule,before),false);
  assert.equal(scheduleIsDue(schedule,after),true);
  schedule.lastRunDate='2026-11-04';
  assert.equal(scheduleIsDue(schedule,after),false);
  assert.throws(()=>scheduleFor({trigger:'Daily',scheduleTime:'25:00',timeZone:'Asia/Kolkata'}));
});

test('an agent can propose only an exact edit to a selected current file',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'switchflow-file-proposal-'));
  try{
    const store=new BusinessDataStore(directory);
    const file=store.add('owner-a',{name:'shifts.csv',base64:Buffer.from('Worker,Shift\nSam,Evening\n').toString('base64')});
    const team={ownerId:'owner-a',workflow:{fileIds:[file.id]}};
    const proposal={fileId:file.id,expectedVersion:1,row:1,column:'Shift',value:'Morning',reason:'Cover opening'};
    const parsed=extractFileProposal(store,team,`APPROVAL REQUIRED\nFILE_EDIT_PROPOSAL: ${JSON.stringify(proposal)}`);
    assert.equal(parsed.before,'Evening');assert.equal(parsed.value,'Morning');
    assert.throws(()=>extractFileProposal(store,{...team,workflow:{fileIds:[]}},`FILE_EDIT_PROPOSAL: ${JSON.stringify(proposal)}`),/not selected/);
    assert.throws(()=>extractFileProposal(store,team,`FILE_EDIT_PROPOSAL: ${JSON.stringify({...proposal,expectedVersion:2})}`),/no longer current/);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
