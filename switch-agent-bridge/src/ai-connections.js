import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';

export const aiProviders=[
  {id:'openai',name:'OpenAI'},
  {id:'anthropic',name:'Claude'},
  {id:'gemini',name:'Gemini'},
];

function protect(value, decrypt=false){
  if(process.platform!=='win32')throw new Error('Saving AI keys requires the Windows desktop application.');
  const operation=decrypt?'Unprotect':'Protect';
  const script=`Add-Type -AssemblyName System.Security; $bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $result=[Security.Cryptography.ProtectedData]::${operation}($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($result))`;
  return new Promise((resolve,reject)=>{
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,stdio:['pipe','pipe','ignore']});
    let output='';
    const timeout=setTimeout(()=>child.kill(),15000);
    child.stdout.on('data',chunk=>output+=chunk);
    child.on('error',()=>{clearTimeout(timeout);reject(new Error('Windows could not secure the AI connection.'));});
    child.on('close',code=>{clearTimeout(timeout);if(code===0)resolve(Buffer.from(output.trim(),'base64'));else reject(new Error('Windows could not open or save the encrypted AI connections.'));});
    child.stdin.on('error',()=>{});
    child.stdin.end(Buffer.from(value).toString('base64'));
  });
}

export async function generateAi(connection,prompt,fetcher=fetch){
  const {provider,apiKey,model}=connection;
  let url,headers,body;
  if(provider==='openai'){
    url='https://api.openai.com/v1/responses';
    headers={Authorization:`Bearer ${apiKey}`};
    body={model,input:prompt,store:false};
  }else if(provider==='anthropic'){
    url='https://api.anthropic.com/v1/messages';
    headers={'x-api-key':apiKey,'anthropic-version':'2023-06-01'};
    body={model,max_tokens:4096,messages:[{role:'user',content:prompt}]};
  }else if(provider==='gemini'){
    url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers={'x-goog-api-key':apiKey};
    body={contents:[{role:'user',parts:[{text:prompt}]}]};
  }else throw new Error('Choose a supported AI provider.');
  let response;
  try{response=await fetcher(url,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});}
  catch{throw new Error('The AI provider could not be reached. Check your internet connection and retry.');}
  if(!response.ok){
    throw new Error(`AI request failed (HTTP ${response.status}). Check the API key, model access, and available API credits.`);
  }
  const data=await response.json();
  if(data.status==='incomplete'||data.stop_reason==='max_tokens')throw new Error('The AI response was cut short. Try a shorter request.');
  const text=provider==='openai'
    ? (data.output||[]).filter(item=>item.type==='message').flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text).join('\n')
    : provider==='anthropic'
      ? (data.content||[]).filter(item=>item.type==='text').map(item=>item.text).join('\n')
      : (data.candidates?.[0]?.content?.parts||[]).filter(part=>!part.thought).map(part=>part.text||'').join('\n');
  if(!text.trim())throw new Error('The AI returned no text. Check that the selected model supports text generation.');
  return text.trim();
}

export class AiConnections {
  constructor(directory,{encrypt=value=>protect(value),decrypt=value=>protect(value,true),generate=generateAi}={}){
    this.file=path.join(directory,'ai-connections.bin');
    this.encrypt=encrypt;this.decrypt=decrypt;this.generate=generate;
    this.queue=Promise.resolve();
  }
  async read(){
    if(!fs.existsSync(this.file))return [];
    return JSON.parse((await this.decrypt(fs.readFileSync(this.file))).toString('utf8'));
  }
  async list(ownerId){
    const connections=await this.read();
    return connections.filter(item=>item.ownerId===ownerId).map(({id,provider,model,testedAt})=>({id,provider,model,testedAt}));
  }
  async get(ownerId,id){
    const connection=(await this.read()).find(item=>item.ownerId===ownerId&&item.id===id);
    if(!connection)throw Object.assign(new Error('This AI connection is unavailable. Choose a connected AI before generating the workflow.'),{status:409});
    return connection;
  }
  async save(ownerId,input){
    const provider=String(input.provider||'');
    const model=String(input.model||'').trim().replace(/^models\//,'');
    const apiKey=String(input.apiKey||'').trim();
    if(!aiProviders.some(item=>item.id===provider)||!model||model.length>180||!apiKey||apiKey.length>4096||/[\r\n]/.test(apiKey)){
      throw Object.assign(new Error('Choose an AI provider and enter your API key and exact model ID.'),{status:400});
    }
    await this.generate({provider,model,apiKey},'Reply with the single word OK.');
    return this.update(async connections=>{
      const existing=connections.find(item=>item.ownerId===ownerId&&item.provider===provider);
      const value={id:existing?.id||crypto.randomUUID(),ownerId,provider,model,apiKey,testedAt:new Date().toISOString()};
      return connections.filter(item=>item.id!==value.id).concat(value);
    });
  }
  async remove(ownerId,id){
    return this.update(async connections=>{
      if(!connections.some(item=>item.id===id&&item.ownerId===ownerId))throw Object.assign(new Error('AI connection not found.'),{status:404});
      return connections.filter(item=>item.id!==id||item.ownerId!==ownerId);
    });
  }
  update(change){
    const operation=this.queue.then(async()=>{
      const connections=await change(await this.read());
      const encrypted=await this.encrypt(Buffer.from(JSON.stringify(connections)));
      fs.mkdirSync(path.dirname(this.file),{recursive:true});
      const temporary=`${this.file}.${crypto.randomUUID()}.tmp`;
      try{fs.writeFileSync(temporary,encrypted,{mode:0o600});fs.renameSync(temporary,this.file);}
      finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
    });
    this.queue=operation.catch(()=>{});
    return operation;
  }
}
