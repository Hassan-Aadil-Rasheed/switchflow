const MAX_CHAT_FILE_BYTES = 1_000_000;
const SUPPORTED_FILE = /\.(csv|json|txt)$/i;

export function contextFileMessages(context) {
  return (context?.threads ?? []).flatMap(thread => [thread.root, ...(thread.replies ?? [])])
    .filter(entry => entry?.kind !== 'room_join' && Array.isArray(entry?.attachments) && entry.attachments.length)
    .map(entry => ({
      messageId: entry.id,
      senderName: entry.on_behalf_of ?? entry.sender_name ?? 'Room participant',
      senderType: entry.sender_kind ?? 'unknown',
      attachments: entry.attachments,
    }));
}

export async function importChatFiles({message, team, agent, api, businessData, saveTeams, broadcast}) {
  if (!team?.room?.id || message.senderType === 'agent') return [];
  if (team.roles.some(role => role.name === message.senderName)) return [];
  const results = [];
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  team.importedMedia ??= [];
  for (const attachment of attachments) {
    const name = String(attachment?.filename ?? '');
    const mxc = attachment?.mxc;
    if (!SUPPORTED_FILE.test(name) || typeof mxc !== 'string' || !mxc.startsWith('mxc://')) continue;
    if (team.importedMedia.includes(mxc)) continue;
    const report = (status, detail, file = null) => {
      const result = {status, name, detail, fileId:file?.id ?? null};
      results.push(result);
      broadcast({type:'chat_file',ownerId:team.ownerId,teamId:team.id,sender:message.senderName,...result});
    };
    try {
      if (!Number.isFinite(attachment.size) || attachment.size < 1 || attachment.size > MAX_CHAT_FILE_BYTES) {
        throw new Error('Chat files must be between 1 byte and 1 MB.');
      }
      const bytes = await api.downloadMedia(agent, team.room.id, mxc, MAX_CHAT_FILE_BYTES);
      if (bytes.length !== attachment.size) throw new Error('The downloaded file size did not match Switch metadata.');
      const file = businessData.add(team.ownerId, {
        name,
        base64:bytes.toString('base64'),
        source:{kind:'chat',roomId:team.room.id,sender:String(message.senderName).slice(0,120)},
      });
      team.importedMedia.push(mxc);
      saveTeams();
      report('imported','Saved in Data & schedules. Select it in Flow builder to use it in a new workflow.',file);
    } catch (error) {
      report('failed',error.message);
    }
  }
  return results;
}
