import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const MAX_BYTES = 1_000_000;
const MAX_ROWS = 2000;
const MAX_COLUMNS = 40;

export function parseCsv(text) {
  const rows=[]; let row=[]; let field=''; let quoted=false;
  for(let i=0;i<text.length;i++) {
    const char=text[i];
    if(quoted) {
      if(char==='"'&&text[i+1]==='"'){field+='"';i++;}
      else if(char==='"')quoted=false;
      else field+=char;
    } else if(char==='"')quoted=true;
    else if(char===','){row.push(field);field='';}
    else if(char==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
    else field+=char;
  }
  if(quoted)throw new Error('CSV has an unclosed quoted field.');
  if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  if(!rows.length||!rows[0].length)throw new Error('The CSV file is empty.');
  if(rows.length>MAX_ROWS+1||rows[0].length>MAX_COLUMNS)throw new Error('CSV supports up to 2,000 rows and 40 columns.');
  const width=rows[0].length;
  if(rows.some(item=>item.length!==width))throw new Error('CSV rows must have the same number of columns.');
  return rows;
}

export function csvText(rows) {
  return rows.map(row=>row.map(cell=>{
    const value=String(cell ?? '');
    return /[",\r\n]/.test(value)?`"${value.replaceAll('"','""')}"`:value;
  }).join(',')).join('\r\n')+'\r\n';
}

function safeName(name) {
  const value=path.basename(String(name||'').replaceAll('\\','/')).slice(0,120);
  if(!/^[^\x00-\x1f<>:"|?*]+\.(csv|json|txt|pdf)$/i.test(value))throw new Error('Upload a CSV, JSON, TXT, or PDF file.');
  return value;
}

async function extractPdfText(bytes) {
  if(bytes.subarray(0,5).toString()!=='%PDF-')throw new Error('This is not a valid PDF file.');
  const {PDFParse}=await import('pdf-parse');
  const parser=new PDFParse({data:new Uint8Array(bytes)});
  try {
    const result=await parser.getText();
    if(result.total>20)throw new Error('PDF files can have up to 20 pages.');
    const text=String(result.text||'').trim();
    if(!text)throw new Error('This PDF has no readable text. Upload a text-based PDF.');
    return {text:text.slice(0,100_000),pageCount:result.total};
  } catch(error) {
    if(/PDF files|readable text/.test(error.message))throw error;
    throw new Error('Could not read this PDF. Upload a text-based PDF without a password.');
  } finally {await parser.destroy();}
}

export class BusinessDataStore {
  constructor(directory) {
    this.directory=path.join(directory,'business-data');
    this.indexPath=path.join(this.directory,'index.json');
    fs.mkdirSync(this.directory,{recursive:true});
    this.files=fs.existsSync(this.indexPath)?JSON.parse(fs.readFileSync(this.indexPath,'utf8')):[];
  }
  save(){fs.writeFileSync(this.indexPath,JSON.stringify(this.files,null,2),{mode:0o600});}
  owned(id,ownerId){
    const file=this.files.find(item=>item.id===id&&item.ownerId===ownerId);
    if(!file)throw Object.assign(new Error('File not found in your workspace.'),{status:404});
    return file;
  }
  location(file){return path.join(this.directory,`${file.id}.${file.type}`);}
  list(ownerId){return this.files.filter(file=>file.ownerId===ownerId).map(({ownerId,...visible})=>visible);}
  add(ownerId,input){
    const name=safeName(input.name);
    if(typeof input.base64!=='string'||input.base64.length>Math.ceil(MAX_BYTES*4/3)+8||!/^[A-Za-z0-9+/]*={0,2}$/.test(input.base64))throw new Error('File must be under 1 MB.');
    const bytes=Buffer.from(input.base64,'base64');
    if(!bytes.length||bytes.length>MAX_BYTES)throw new Error('File must be between 1 byte and 1 MB.');
    const type=name.split('.').pop().toLowerCase();
    if(type==='pdf')return extractPdfText(bytes).then(({text,pageCount})=>this.persist(ownerId,input,name,type,bytes,null,text,pageCount));
    const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    let rowCount=null;
    if(type==='csv')rowCount=parseCsv(text).length-1;
    if(type==='json')JSON.parse(text);
    return this.persist(ownerId,input,name,type,bytes,rowCount);
  }
  persist(ownerId,input,name,type,bytes,rowCount,extractedText=null,pageCount=null){
    const now=new Date().toISOString();
    const source=input.source?.kind==='chat'?{kind:'chat',roomId:String(input.source.roomId).slice(0,150),sender:String(input.source.sender).slice(0,120)}:{kind:'app'};
    const file={id:crypto.randomUUID(),ownerId,name,type,size:bytes.length,rowCount,pageCount,version:1,createdAt:now,updatedAt:now,source};
    fs.writeFileSync(this.location(file),bytes,{flag:'wx',mode:0o600});
    if(extractedText!==null)fs.writeFileSync(`${this.location(file)}.txt`,extractedText,{flag:'wx',mode:0o600});
    this.files.push(file);this.save();
    return this.list(ownerId).find(item=>item.id===file.id);
  }
  content(id,ownerId){
    const file=this.owned(id,ownerId);
    const text=fs.readFileSync(file.type==='pdf'?`${this.location(file)}.txt`:this.location(file),'utf8');
    return {file:this.list(ownerId).find(item=>item.id===id),text,rows:file.type==='csv'?parseCsv(text):null,
      ...(file.type==='pdf'?{base64:fs.readFileSync(this.location(file)).toString('base64')}:{}),
    };
  }
  updateCell(id,ownerId,{version,row,column,value}){
    const file=this.owned(id,ownerId);
    if(file.type!=='csv')throw new Error('Only CSV tables can be edited in the app.');
    if(version!==file.version)throw Object.assign(new Error('This file changed. Reload it before editing.'),{status:409});
    const rows=parseCsv(fs.readFileSync(this.location(file),'utf8'));
    if(!Number.isInteger(row)||row<1||row>=rows.length||!Number.isInteger(column)||column<0||column>=rows[0].length)throw new Error('Choose a valid data cell.');
    if(typeof value!=='string'||value.length>2000)throw new Error('Cell value is too long.');
    const before=rows[row][column];rows[row][column]=value;
    const next=csvText(rows);
    if(Buffer.byteLength(next)>MAX_BYTES)throw new Error('The updated file exceeds 1 MB.');
    const backup=path.join(this.directory,`${file.id}.v${file.version}.csv`);
    fs.copyFileSync(this.location(file),backup);
    fs.writeFileSync(this.location(file),next,{mode:0o600});
    file.version++;file.size=Buffer.byteLength(next);file.updatedAt=new Date().toISOString();this.save();
    return {file:this.list(ownerId).find(item=>item.id===id),change:{row,column,columnName:rows[0][column],before,after:value,at:file.updatedAt}};
  }
  previewCellChange(id,ownerId,{expectedVersion,row,column,value}){
    const file=this.owned(id,ownerId);
    if(file.type!=='csv')throw new Error('This proposal requires a CSV file.');
    if(!Number.isInteger(expectedVersion)||expectedVersion!==file.version)throw new Error('The proposed file version is no longer current.');
    const rows=parseCsv(fs.readFileSync(this.location(file),'utf8'));
    const columnIndex=typeof column==='string'?rows[0].indexOf(column):column;
    if(!Number.isInteger(row)||row<1||row>=rows.length||!Number.isInteger(columnIndex)||columnIndex<0||columnIndex>=rows[0].length)throw new Error('The proposed row or column does not exist.');
    if(typeof value!=='string'||value.length>2000)throw new Error('The proposed value is invalid.');
    return {fileId:id,fileName:file.name,expectedVersion,row,column:columnIndex,columnName:rows[0][columnIndex],before:rows[row][columnIndex],value};
  }
  summary(id,ownerId){
    const {file,text,rows}=this.content(id,ownerId);
    return {id:file.id,name:file.name,type:file.type,version:file.version,rowCount:file.rowCount,preview:rows?csvText(rows.slice(0,Math.min(rows.length,31))).slice(0,4000):text.slice(0,4000)};
  }
}

export function extractFileProposal(store,team,body) {
  const raw=body.match(/FILE_EDIT_PROPOSAL:\s*(\{[^\r\n]*\})/i)?.[1];
  if(!raw)return null;
  const proposed=JSON.parse(raw);
  if(!(team.workflow.fileIds||[]).includes(proposed.fileId))throw new Error('The proposed file was not selected for this workflow.');
  const preview=store.previewCellChange(proposed.fileId,team.ownerId,proposed);
  return {id:crypto.randomUUID(),...preview,reason:String(proposed.reason||'').slice(0,500),applied:false};
}
