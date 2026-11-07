import fs from 'node:fs';
import path from 'node:path';

export class ChatPreferences {
  constructor(directory){
    this.file=path.join(directory,'chat-preferences.json');
    this.values=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{};
  }
  get(ownerId){
    const value=this.values[ownerId]||{};
    return {connectionId:value.connectionId||'',destinations:{...(value.destinations||{})}};
  }
  set(ownerId,{connectionId,channelId}){
    if(typeof connectionId!=='string'||!connectionId||connectionId.length>150)throw Object.assign(new Error('Choose a connected chat app.'),{status:400});
    if(typeof channelId!=='string'||channelId.length>150)throw Object.assign(new Error('Enter a valid chat or channel ID.'),{status:400});
    const value=this.get(ownerId);
    value.connectionId=connectionId;
    if(channelId.trim())value.destinations[connectionId]=channelId.trim();
    else delete value.destinations[connectionId];
    this.values[ownerId]=value;
    fs.writeFileSync(this.file,JSON.stringify(this.values,null,2),{mode:0o600});
    return this.get(ownerId);
  }
}
