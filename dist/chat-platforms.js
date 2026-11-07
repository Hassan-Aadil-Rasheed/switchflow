globalThis.SwitchFlowPlatforms = (() => {
  const platforms=[{key:'telegram',name:'Telegram',mark:'TG'},{key:'discord',name:'Discord',mark:'DC'},{key:'slack',name:'Slack',mark:'SL'},{key:'teams',name:'Microsoft Teams',mark:'MT'},{key:'mattermost',name:'Mattermost',mark:'MM'}];
  const connected=item=>['active','connected','running','listening'].includes(String(item.status||'').toLowerCase());
  function summarize(connections=[]){
    const cards=platforms.map(platform=>({...platform,accounts:connections.filter(item=>(item.bridge_type||item.type)===platform.key)}));
    return {cards,apps:cards.filter(card=>card.accounts.some(connected)).length,accounts:cards.reduce((sum,card)=>sum+card.accounts.filter(connected).length,0)};
  }
  return {platforms,connected,summarize};
})();
