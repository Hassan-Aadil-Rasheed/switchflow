export function scheduleFor(workflow) {
  if(workflow.trigger!=='Daily')return {enabled:false,time:null,timeZone:null,lastRunDate:null,lastError:null};
  const time=String(workflow.scheduleTime||'18:00');
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Choose a valid daily time.');
  const timeZone=String(workflow.timeZone||'');
  try { new Intl.DateTimeFormat('en-US',{timeZone}).format(new Date()); }
  catch {throw new Error('Choose a valid time zone.');}
  return {enabled:true,time,timeZone,lastRunDate:null,lastError:null};
}

export function localClock(date,timeZone) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{
    timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(date).map(part=>[part.type,part.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};
}

export function scheduleIsDue(schedule,now=new Date()) {
  if(!schedule?.enabled)return false;
  const local=localClock(now,schedule.timeZone);
  return local.time>=schedule.time&&schedule.lastRunDate!==local.date;
}
