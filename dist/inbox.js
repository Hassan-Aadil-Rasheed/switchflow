const inboxState={rooms:[],room:null,messages:[],thread:null,drafts:new Map(),loading:0,sending:false,refreshing:false,opening:false};
const appNames={telegram:'Telegram',discord:'Discord',slack:'Slack',teams:'Microsoft Teams',mattermost:'Mattermost'};
const roomKey=room=>room.roomId||room.room_id;
const messageKey=message=>message.messageId||message.message_id;
const threadKey=message=>message.threadRootId||message.thread_root_id||null;
const inboxDraftKey=()=>`${inboxState.room?roomKey(inboxState.room):''}:${inboxState.thread||'channel'}`;
const inboxRoomLabel=room=>[appNames[room.bridgeType]||room.bridgeType||'Switch',room.accountName,room.channelName||room.name].filter(Boolean).join(' · ');
function inboxLabel(){const room=inboxState.room;if(!room)return 'No conversation selected';const root=inboxState.messages.find(message=>messageKey(message)===inboxState.thread);return `${inboxRoomLabel(room)} → ${inboxState.thread?(root?.sender?.name||'Earlier conversation'):'Channel activity'}`;}
function resetInboxRoom(){inboxState.loading++;inboxState.room=null;inboxState.thread=null;inboxState.messages=[];renderInboxRooms();renderInboxConversation();$('#inboxThreads').textContent='Choose a channel first.';}
function clearInbox(){inboxState.rooms=[];inboxState.drafts.clear();resetInboxRoom();}
async function refreshInbox(){
  if(inboxState.refreshing||inboxState.opening||inboxState.sending)return;
  inboxState.refreshing=true;
  const selection=inboxState.loading;
  $('#refreshInbox').disabled=true;
  try{
    const result=await controlRequest('/api/inbox');
    const rooms=result.chats||[];
    if(JSON.stringify(rooms)!==JSON.stringify(inboxState.rooms)){inboxState.rooms=rooms;renderInboxRooms();}
    const room=inboxState.room&&rooms.find(item=>roomKey(item)===roomKey(inboxState.room)&&!item.needsJoin);
    if(selection===inboxState.loading){
      if(inboxState.room&&!room)resetInboxRoom();
      if(room)await loadInboxRoom(room,true);
    }
    $('#inboxLive').textContent='Live · checking every 5 seconds';
  }
  catch(error){if(error.status===401)clearInbox();$('#inboxLive').textContent=`Inbox offline · ${error.message}`;}
  finally{inboxState.refreshing=false;$('#refreshInbox').disabled=false;}
}
function renderInboxRooms(){
  const list=$('#inboxRooms');list.replaceChildren();const platform=$('#inboxPlatform').value;
  renderInboxApps();
  const rooms=inboxState.rooms.filter(room=>platform==='all'||room.bridgeType===platform);
  $('#inboxCount').textContent=`${rooms.length} ${rooms.length===1?'chat':'chats'} · ${appNames[platform]||'All apps'}`;
  if(!rooms.length){list.textContent='No channels are linked in Switch for this selection.';return;}
  for(const room of rooms){
    const button=document.createElement('button');button.type='button';button.className='inbox-choice';
    button.setAttribute('aria-pressed',String(inboxState.room&&roomKey(inboxState.room)===roomKey(room)));
    const title=document.createElement('strong');title.textContent=room.channelName||room.name||'Chat';
    const preview=document.createElement('span');
    preview.textContent=room.needsJoin?'Open to join this chat':room.lastMessage?`${room.lastMessage.senderName}: ${room.lastMessage.preview}`:'No messages yet';
    button.append(title,preview);button.addEventListener('click',()=>openInboxRoom(room));list.append(button);
  }
}
function renderInboxApps(){
  const list=$('#inboxApps');list.replaceChildren();
  const available=['all',...new Set(inboxState.rooms.map(room=>room.bridgeType).filter(Boolean))];
  const logos=new Set(['telegram','discord','slack','teams','mattermost']);
  for(const platform of available){
    const filter=$('#inboxPlatform');
    if(!Array.from(filter.options).some(option=>option.value===platform))filter.add(new Option(appNames[platform]||platform,platform));
    const button=document.createElement('button');button.type='button';button.className=`inbox-app-button inbox-app-${platform}`;
    if(logos.has(platform)){
      const logo=document.createElement('img');logo.src=`./assets/${platform}-logo.svg`;logo.alt='';button.append(logo);
    }else button.textContent=platform==='all'?'⌂':platform.slice(0,1).toUpperCase();
    button.title=appNames[platform]||'All apps';button.setAttribute('aria-label',button.title);
    button.setAttribute('aria-pressed',String($('#inboxPlatform').value===platform));
    button.addEventListener('click',()=>{$('#inboxPlatform').value=platform;resetInboxRoom();$('#inboxFeedback').textContent='';});
    list.append(button);
  }
}
async function openInboxRoom(room){
  if(inboxState.opening)return;
  inboxState.opening=true;
  const selection=++inboxState.loading;
  $('#inboxFeedback').textContent='Opening chat…';
  try{
    if(room.needsJoin)await controlRequest(`/api/inbox/${encodeURIComponent(roomKey(room))}/join`,'POST');
    if(selection!==inboxState.loading)return;
    await loadInboxRoom({...room,needsJoin:false});
  }catch(error){$('#inboxFeedback').textContent=`Cannot open chat: ${error.message}`;}
  finally{inboxState.opening=false;}
}
async function loadInboxRoom(room,keepThread=false){
  const request=++inboxState.loading;
  const result=await controlRequest(`/api/inbox/${encodeURIComponent(roomKey(room))}/messages`);
  if(request!==inboxState.loading)return;
  const previous=inboxState.room&&roomKey(inboxState.room)===roomKey(room);
  const unchanged=previous&&inboxRoomLabel(inboxState.room)===inboxRoomLabel(room)&&JSON.stringify(inboxState.messages)===JSON.stringify(result.messages||[]);
  inboxState.room=room;inboxState.messages=result.messages||[];
  if(keepThread&&unchanged)return;
  if(!keepThread||!previous)inboxState.thread=null;
  renderInboxRooms();renderInboxThreads();renderInboxConversation();
  if(!keepThread)$('#inboxFeedback').textContent=result.hasMore?'Showing the latest 200 messages in this channel. Earlier history remains in the messaging app.':'';
}
function renderInboxThreads(){
  const list=$('#inboxThreads');list.replaceChildren();
  const add=(label,preview,id)=>{const button=document.createElement('button');button.type='button';button.className='inbox-choice';button.setAttribute('aria-pressed',String(inboxState.thread===id));const title=document.createElement('strong');title.textContent=label;const text=document.createElement('span');text.textContent=preview;button.append(title,text);button.addEventListener('click',()=>{inboxState.thread=id;renderInboxThreads();renderInboxConversation();});list.append(button);};
  add('Channel activity','Everyone in this channel',null);
  for(const message of inboxState.messages.filter(item=>!threadKey(item)&&item.sender?.kind!=='agent'&&item.body))add(`${message.sender?.name||'Participant'}: ${message.body.slice(0,28)}`,message.body.slice(0,100),messageKey(message));
}
function renderInboxConversation(){
  const label=inboxLabel();$('#inboxDestination').textContent=inboxState.room?(inboxState.room.channelName||inboxState.room.name||'Chat'):'Choose a chat';$('#inboxReplyTo').textContent=`Send to: ${label}`;
  $('#inboxReplyForm').hidden=!inboxState.room;
  const draft=inboxState.drafts.get(inboxDraftKey())?.body||'';
  if($('#inboxReplyBody').value!==draft)$('#inboxReplyBody').value=draft;
  const list=$('#inboxMessages');list.replaceChildren();
  const messages=inboxState.messages.filter(message=>!inboxState.thread||messageKey(message)===inboxState.thread||threadKey(message)===inboxState.thread);
  for(const message of messages){const article=document.createElement('article');article.className=`inbox-message ${message.sender?.kind==='agent'?'is-team':'is-customer'}`;const sender=document.createElement('strong');sender.textContent=message.sender?.name||'Participant';const time=document.createElement('small');const date=new Date(message.sentAt||message.sent_at);time.textContent=Number.isNaN(date.getTime())?'':date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});const body=document.createElement('p');body.textContent=message.body||'';article.append(sender,body,time);for(const file of message.attachments||[]){const attachment=document.createElement('p');attachment.className='control-note';attachment.textContent=`Attachment: ${file.filename}`;article.append(attachment);}list.append(article);}
  if(!messages.length)list.textContent=inboxState.room?'No messages in this conversation yet.':'Choose a channel to read and reply.';
}
$('#inboxReplyBody').addEventListener('input',()=>{const key=inboxDraftKey();const existing=inboxState.drafts.get(key);inboxState.drafts.set(key,{body:$('#inboxReplyBody').value,requestId:existing?.requestId||crypto.randomUUID()});});
$('#inboxReplyForm').addEventListener('submit',async event=>{
  event.preventDefault();if(inboxState.sending||!inboxState.room)return;
  const room=inboxState.room,thread=inboxState.thread,key=inboxDraftKey(),destination=inboxLabel();const draft=inboxState.drafts.get(key)||{body:$('#inboxReplyBody').value,requestId:crypto.randomUUID()};
  inboxState.sending=true;$('#inboxSend').disabled=true;$('#inboxSend').textContent='Sending…';
  try{await controlRequest(`/api/inbox/${encodeURIComponent(roomKey(room))}/messages`,'POST',{body:draft.body,threadRootId:thread,requestId:draft.requestId});inboxState.drafts.delete(key);if(inboxDraftKey()===key)$('#inboxReplyBody').value='';$('#inboxFeedback').textContent=`Reply sent to ${destination}.`;if(inboxState.room&&roomKey(inboxState.room)===roomKey(room))await loadInboxRoom(room,true);}
  catch(error){$('#inboxFeedback').textContent=`Reply not confirmed: ${error.message}. Retry keeps the same message reference.`;}
  finally{inboxState.sending=false;$('#inboxSend').disabled=false;$('#inboxSend').textContent='Send reply';}
});
$('#refreshInbox').addEventListener('click',refreshInbox);
$('#inboxPlatform').addEventListener('change',()=>{resetInboxRoom();$('#inboxFeedback').textContent='';});
$('#inboxLink').addEventListener('toggle',async()=>{
  if(!$('#inboxLink').open)return;
  const account=$('#inboxAccount'),submit=$('#inboxLinkSubmit'),status=$('#inboxLinkStatus');
  account.replaceChildren();
  submit.disabled=true;
  status.textContent='Loading connected accounts…';
  try{
    const result=await controlRequest('/api/connections');
    const connections=(Array.isArray(result.connections)?result.connections:result.connections?.bridges||[]);
    for(const connection of connections){
      if(!['active','connected','running','listening'].includes(connection.status))continue;
      const type=connection.bridge_type||connection.type;
      account.add(new Option(`${appNames[type]||type} · ${connection.display_name}`,connection.bridge_id||connection.id));
    }
    status.textContent=account.options.length?'':'Set up an active account in Connections first.';
    submit.disabled=!account.options.length;
  }catch(error){status.textContent=error.message;}
});
$('#inboxLinkForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const submit=$('#inboxLinkSubmit'),status=$('#inboxLinkStatus');
  if(submit.disabled)return;
  submit.disabled=true;
  status.textContent='Linking channel…';
  try{
    await controlRequest('/api/inbox','POST',{
      connectionId:$('#inboxAccount').value,
      channelId:$('#inboxChannelId').value,
      name:$('#inboxChannelName').value,
    });
    $('#inboxChannelName').value='';$('#inboxChannelId').value='';
    status.textContent='Channel linked. Find it under All apps.';
    $('#inboxPlatform').value='all';renderInboxRooms();
    await refreshInbox();
  }catch(error){status.textContent=`Cannot link channel: ${error.message}`;}
  finally{submit.disabled=false;}
});
setInterval(()=>{if(!document.hidden&&$('#chatsView').classList.contains('is-visible'))refreshInbox();},5000);
