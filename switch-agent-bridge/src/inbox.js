import crypto from 'node:crypto';

export function inboxChats(chats, rooms, teams) {
  const catalog = new Map(rooms.map(room => [room.id, room]));
  const titles = new Map(teams.map(team => [team.room?.id, team.title]));
  const members = new Map(chats.map(chat => [chat.roomId || chat.room_id, chat]));
  const linkedRooms = rooms.filter(room => room.bridge_id && room.bridge_type && !room.archived);
  // Keep the customer inbox limited to connected messaging channels. Private
  // agent work rooms and Switch setup chats belong outside this view.
  const ids = new Set(linkedRooms.map(room => room.id));
  return [...ids].map(roomId => {
    const chat = members.get(roomId);
    const room = catalog.get(roomId);
    return {
      ...chat, roomId,
      name: chat?.name || room?.name,
      bridgeType: chat?.bridgeType || room?.bridge_type,
      channelName: chat?.channelName || room?.name,
      accountName: room?.bridge_display_name || null,
      workflowName: titles.get(roomId) || null,
      needsJoin: !chat,
    };
  });
}

export async function inboxReply(gateway,roomId,input){
  const body=String(input.body||'').trim();
  if(!body||body.length>4000)throw Object.assign(new Error('Write a reply of 1–4,000 characters.'),{status:400});
  const threadRootId=input.threadRootId||null;
  if(threadRootId){
    const page=await gateway(`/chats/${encodeURIComponent(roomId)}/messages?limit=200`);
    if(!page.messages?.some(message=>(message.messageId||message.message_id)===threadRootId&&(message.roomId||message.room_id)===roomId))throw Object.assign(new Error('This conversation is no longer in the loaded channel. Refresh Chats before replying.'),{status:409});
  }
  const requestId=/^[a-f0-9-]{36}$/i.test(input.requestId||'')?input.requestId:crypto.randomUUID();
  return gateway(`/chats/${encodeURIComponent(roomId)}/messages`,'POST',{requestId,body,threadRootId});
}
