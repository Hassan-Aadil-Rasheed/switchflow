import crypto from 'node:crypto';

// An order starts from a real group message, never from an agent's generated text.
export function orderRequest(message) {
  if (message.senderType === 'agent' || !message.senderId) return null;
  if(/\bhas been (?:accepted|declined) by the business owner\b|\bOrder reference:\s*[a-f0-9-]{36}\b/i.test(message.body))return null;
  const match = message.body.match(/\b(\d{1,6})\s+([\p{L}][\p{L}\s-]{1,50}?)(?=\s+(?:for|by|on|please|tomorrow|today)\b|[.!?,]|$)/iu);
  if (!match || !/\b(order|want|need|buy|make|deliver|purchase)\b/i.test(message.body)) return null;
  return {id:crypto.randomUUID(),messageId:message.messageId,customerId:message.senderId,
    customerName:message.senderName,quantity:Number(match[1]),item:match[2].trim(),
    request:message.body.slice(0,1000),status:'checking',createdAt:new Date().toISOString()};
}

// Capacity CSV: item,capacity,committed. The owner maintains these numbers.
export function capacityFromFiles(store,team,order) {
  const key=value=>String(value||'').trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  // Customers commonly use singular wording ("10 cookie") while stock files
  // use plurals ("cookies"). Treat that ordinary singular/plural difference
  // as the same item without broad fuzzy matching.
  const sameItem=(left,right)=>left===right||(left.endsWith('s')&&left.slice(0,-1)===right)||(right.endsWith('s')&&right.slice(0,-1)===left);
  for(const id of team.workflow.fileIds||[]){
    const {file,rows}=store.content(id,team.ownerId);
    if(!rows?.length)continue;
    const headers=rows[0].map(key);
    const itemColumn=headers.findIndex(value=>['item','product'].includes(value));
    const capacityColumn=headers.findIndex(value=>['capacity','maxunits'].includes(value));
    const committedColumn=headers.findIndex(value=>['committed','reserved'].includes(value));
    if(itemColumn<0||capacityColumn<0||committedColumn<0)continue;
    const rowIndex=rows.slice(1).findIndex(value=>sameItem(key(value[itemColumn]),key(order.item)));
    const row=rowIndex<0?null:rows[rowIndex+1];
    if(!row)continue;
    const capacity=Number(row[capacityColumn]),committed=Number(row[committedColumn]);
    if(!Number.isSafeInteger(capacity)||!Number.isSafeInteger(committed)||capacity<0||committed<0||committed>capacity)continue;
    const available=capacity-committed;
    return {status:available>=order.quantity?'feasible':'unfeasible',available,capacity,committed,
      fileId:id,version:file.version,row:rowIndex+1,column:committedColumn,
      evidence:`${file.name} version ${file.version}: ${capacity} capacity - ${committed} committed = ${available} available ${order.item}.`};
  }
  return {status:'unknown',evidence:'No selected capacity CSV row for this item. Upload a CSV with item,capacity,committed columns.'};
}

export function capacityProposal(body, order) {
  const marker='ORDER_CAPACITY:';
  const start=body.indexOf(marker);
  if(start<0||!order)return null;
  const jsonStart=body.indexOf('{',start+marker.length);
  if(jsonStart<0||body.slice(start+marker.length,jsonStart).trim())return null;
  let depth=0,inString=false,escaped=false,end=-1;
  for(let index=jsonStart;index<body.length;index++){
    const char=body[index];
    if(inString){
      if(escaped)escaped=false;
      else if(char==='\\')escaped=true;
      else if(char==='"')inString=false;
    }else if(char==='"')inString=true;
    else if(char==='{')depth++;
    else if(char==='}'&&--depth===0){end=index+1;break;}
  }
  if(end<0)return null;
  const value=JSON.parse(body.slice(jsonStart,end));
  if (value.orderId!==order.id || !['feasible','unfeasible','unknown'].includes(value.status))
    throw new Error('Capacity assessment does not match the current order.');
  if (typeof value.evidence!=='string' || !value.evidence.trim())
    throw new Error('Capacity assessment needs evidence.');
  return {status:value.status,evidence:value.evidence.trim().slice(0,2000),
    limitation:String(value.limitation||'').slice(0,1000)};
}

// Keep the owner decision request stable even when the analyst drafts a
// different approval packet. The structured assessment remains available to
// the room listener, while the customer-facing decision is always explicit.
export function orderApprovalMessage(answer, order) {
  let assessment;
  try { assessment=capacityProposal(answer,order); } catch { /* ask for a decision with unknown capacity */ }
  assessment||={status:'unknown',evidence:order.capacity?.evidence||'The capacity assessment is unavailable.',limitation:'The analyst assessment needs review.'};
  const record={orderId:order.id,...assessment};
  const recorded=order.capacity?.evidence||'No matching capacity record was found.';
  const caveat=assessment.status==='unknown'?'Verify the requested time, recipe, usable stock, staff, equipment, and other commitments before accepting.':assessment.status==='unfeasible'?'The assessment says this order cannot currently be fulfilled.':'Review the capacity evidence before accepting.';
  return `ORDER_CAPACITY: ${JSON.stringify(record)}\nAPPROVAL REQUIRED — Customer order ${order.id}\n${order.customerName} requests ${order.quantity} ${order.item}. ${recorded}\n${caveat}\nOwner: Do you want to accept or decline this customer order? Choose Accept order or Decline order in SwitchFlow Approvals. No order decision has been sent to the customer.`;
}
