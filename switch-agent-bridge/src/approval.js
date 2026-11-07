export function isHumanApproval(message, phrase, agentNames = []) {
  let body=message.body.trim();
  for(const name of agentNames)if(body.startsWith(`@${name} `)){body=body.slice(name.length+2).trim();break;}
  return body.toLocaleUpperCase('en-US') === phrase.toLocaleUpperCase('en-US')
    && !agentNames.includes(message.senderName)
    && message.senderType !== 'agent';
}
