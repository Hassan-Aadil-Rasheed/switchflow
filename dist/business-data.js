let openBusinessFile=null;
let openBusinessPage=0;
let businessDownloadUrl=null;

function businessFileOptions(files) {
  const selected=new Set([...document.querySelectorAll('#businessFiles input:checked')].map(item=>item.value));
  const target=document.querySelector('#businessFiles');
  target.replaceChildren();
  if(!files.length){target.textContent='No files yet. Upload a schedule, sales, or inventory file in Data & schedules.';return;}
  for(const file of files){
    const label=document.createElement('label');label.className='check';
    const input=document.createElement('input');input.type='checkbox';input.name='fileIds';input.value=file.id;input.dataset.filename=file.name;input.checked=selected.has(file.id);
    const text=document.createElement('span');text.textContent=`${file.name} · version ${file.version}`;
    label.append(input,text);target.append(label);
  }
}

async function refreshBusinessData(){
  const [files,teams]=await Promise.all([controlRequest('/api/files'),controlRequest('/api/teams')]);
  businessFileOptions(files);
  const list=document.querySelector('#businessFileList');list.replaceChildren();
  document.querySelector('#businessFileCount').textContent=`${files.length} ${files.length===1?'file':'files'}`;
  for(const file of files){
    const button=document.createElement('button');button.type='button';button.className='data-file-button';
    const type=document.createElement('span');type.className='data-file-type';type.textContent=file.type.toUpperCase();
    const details=document.createElement('span');details.className='data-file-details';
    const name=document.createElement('strong');name.textContent=file.name;
    const meta=document.createElement('small');meta.textContent=`Version ${file.version} · ${file.rowCount??'—'} rows${file.source?.kind==='chat'?` · from ${file.source.sender}`:''}`;
    const arrow=document.createElement('span');arrow.className='data-file-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='›';
    details.append(name,meta);button.append(type,details,arrow);
    button.addEventListener('click',()=>openBusinessDataFile(file.id));list.append(button);
  }
  if(!files.length)list.textContent='No files yet. Choose a file above to get started.';
  renderSchedules(teams);
  if (typeof refreshOverviewReadiness === 'function') refreshOverviewReadiness();
}

function renderSchedules(teams){
  const list=document.querySelector('#workflowScheduleList');list.replaceChildren();
  if(!teams.length){list.textContent='Create an agent team from Flow builder to schedule it.';return;}
  for(const team of teams){
    const card=document.createElement('article');card.className='schedule-card';
    const heading=document.createElement('h4');heading.textContent=team.title;
    const check=document.createElement('label');check.className='check';
    const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=team.schedule?.enabled===true;
    const enabledText=document.createElement('span');enabledText.textContent='Run daily';check.append(enabled,enabledText);
    const time=document.createElement('input');time.type='time';time.value=team.schedule?.time||'18:00';time.setAttribute('aria-label',`Daily run time for ${team.title}`);
    const save=document.createElement('button');save.type='button';save.className='button secondary';save.textContent='Save schedule';
    const info=document.createElement('p');info.textContent=`Time zone: ${team.schedule?.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone}. ${team.schedule?.lastRunDate?'Last scheduled run: '+team.schedule.lastRunDate+'. ':''}${team.schedule?.lastError?'Last error: '+team.schedule.lastError:''}`;
    if(team.approvalPending){const review=document.createElement('button');review.type='button';review.className='button primary';review.textContent='Review pending approval';review.addEventListener('click',()=>openTeamApproval(team));card.append(review);}
    if(team.room){const activity=document.createElement('button');activity.type='button';activity.className='button secondary';activity.textContent='View agent activity';activity.addEventListener('click',()=>openTeamActivity(team).catch(error=>document.querySelector('#businessDataFeedback').textContent=error.message));card.append(activity);}
    save.addEventListener('click',async()=>{
      save.disabled=true;
      try{
        await controlRequest(`/api/teams/${team.id}/schedule`,'PUT',{enabled:enabled.checked,time:time.value,timeZone:team.schedule?.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone});
        await refreshBusinessData();document.querySelector('#businessDataFeedback').textContent='Schedule saved in SwitchFlow.';
      }catch(error){info.textContent=error.message;}finally{save.disabled=false;}
    });
    card.append(heading,check,time,save,info);list.append(card);
  }
}

async function openBusinessDataFile(id,page=0){
  const result=await controlRequest(`/api/files/${id}`);
  openBusinessFile=result;openBusinessPage=page;
  document.querySelector('#selectedFileTitle').textContent=result.file.name;
  document.querySelector('#selectedFileMeta').textContent=`Version ${result.file.version} · updated ${new Date(result.file.updatedAt).toLocaleString()} · ${result.file.rowCount??'—'} rows`;
  const preview=document.querySelector('#businessFilePreview');preview.replaceChildren();
  if(result.rows){
    const start=1+page*50,end=Math.min(result.rows.length,start+50);
    const table=document.createElement('table');table.className='data-table';
    const head=document.createElement('thead');const header=document.createElement('tr');
    for(const name of result.rows[0]){const th=document.createElement('th');th.textContent=name;header.append(th);}head.append(header);table.append(head);
    const body=document.createElement('tbody');
    for(let row=start;row<end;row++){
      const tr=document.createElement('tr');
      for(let column=0;column<result.rows[row].length;column++){
        const td=document.createElement('td');const input=document.createElement('input');input.type='text';input.value=result.rows[row][column];input.setAttribute('aria-label',`${result.rows[0][column]}, row ${row}`);
        input.addEventListener('change',async()=>{
          input.disabled=true;
          try{
            const updated=await controlRequest(`/api/files/${id}`,'PATCH',{version:openBusinessFile.file.version,row,column,value:input.value});
            openBusinessFile.file=updated.file;openBusinessFile.rows[row][column]=input.value;
            document.querySelector('#selectedFileMeta').textContent=`Version ${updated.file.version} · saved ${new Date(updated.file.updatedAt).toLocaleString()}`;
            document.querySelector('#businessDataFeedback').textContent=`Saved ${updated.change.columnName}, row ${row}. Previous version is kept on this laptop.`;
            await refreshBusinessData();
          }catch(error){input.value=openBusinessFile.rows[row][column];document.querySelector('#businessDataFeedback').textContent=error.message;}
          finally{input.disabled=false;}
        });
        td.append(input);tr.append(td);
      }body.append(tr);
    }table.append(body);preview.append(table);
    const pager=document.createElement('div');pager.className='data-pager';
    const previous=document.createElement('button');previous.type='button';previous.className='button secondary';previous.textContent='Previous';previous.disabled=page===0;previous.addEventListener('click',()=>openBusinessDataFile(id,page-1));
    const next=document.createElement('button');next.type='button';next.className='button secondary';next.textContent='Next';next.disabled=end>=result.rows.length;next.addEventListener('click',()=>openBusinessDataFile(id,page+1));
    const count=document.createElement('span');count.textContent=`Rows ${start}–${end-1} of ${result.rows.length-1}`;
    pager.append(previous,count,next);preview.append(pager);
  }else{const pre=document.createElement('pre');pre.textContent=result.text.slice(0,100000);preview.append(pre);}
  if(businessDownloadUrl)URL.revokeObjectURL(businessDownloadUrl);
  businessDownloadUrl=URL.createObjectURL(new Blob([result.text],{type:result.file.type==='csv'?'text/csv':'text/plain'}));
  const download=document.querySelector('#businessFileDownload');download.href=businessDownloadUrl;download.download=result.file.name;download.hidden=false;
}

document.querySelector('#businessUploadForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const input=document.querySelector('#businessUpload');const file=input.files[0];if(!file)return;
  const feedback=document.querySelector('#businessDataFeedback');
  if(file.size>1_000_000){feedback.textContent='Choose a file under 1 MB.';return;}
  feedback.textContent='Uploading into your SwitchFlow workspace…';
  try{
    const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
    const result=await controlRequest('/api/files','POST',{name:file.name,base64:btoa(binary)});
    input.value='';document.querySelector('#businessUploadName').textContent='Choose a file';await refreshBusinessData();await openBusinessDataFile(result.id);
    feedback.textContent=`${result.name} is ready. Select it in Flow builder to give its current data to agents.`;
  }catch(error){feedback.textContent=error.message;}
});
document.querySelector('#businessUpload').addEventListener('change',event=>{
  document.querySelector('#businessUploadName').textContent=event.target.files[0]?.name||'Choose a file';
});
document.querySelector('.nav-item[data-view="data"]').addEventListener('click',()=>refreshBusinessData().catch(error=>document.querySelector('#businessDataFeedback').textContent=error.message));
