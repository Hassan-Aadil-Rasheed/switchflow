import crypto from 'node:crypto';

// Switch session credentials stay in memory; the browser gets an opaque local session.
const sessions = new Map();
export function createWebsiteControl(baseUrl, {onSessionChanged = () => {}} = {}) {
  function session(request) {
    const id = /(?:^|;\s*)switchflow_session=([^;]+)/.exec(request.headers.cookie || '')?.[1];
    const value = sessions.get(id);
    if (!value || value.expires < Date.now()) {
      const error = new Error('Sign in to Switch from Connections first.'); error.status = 401; throw error;
    }
    return value;
  }
  async function gateway(request, route, method = 'GET', body) {
    const current = session(request);
    const result = await fetch(`${baseUrl}/gateway${route}`, {
      method, headers: { Cookie: current.cookie, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
    });
    const responseText = result.status===204 ? '' : await result.text();
    let data;
    try { data=responseText ? JSON.parse(responseText) : {}; }
    catch { data={detail:responseText.slice(0,200)||'Switch returned an unreadable response.'}; }
    if (!result.ok) { const error = new Error(typeof data.detail === 'string' ? data.detail : data.detail?.message || 'Switch rejected this request.'); error.status = result.status; throw error; }
    return data;
  }
  async function login(request, response, credentials) {
    const result = await fetch(`${baseUrl}/gateway/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({email: credentials.email, password: credentials.password}), signal: AbortSignal.timeout(15000),
    });
    const user = await result.json();
    if (!result.ok) { const error = new Error(user.detail || 'Sign-in failed.'); error.status = result.status; throw error; }
    const cookie = result.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    if (!cookie) throw new Error('Switch did not return a session.');
    const id = crypto.randomBytes(32).toString('hex');
    const value = {id,cookie,user,expires:Date.now() + 24 * 60 * 60 * 1000};
    sessions.set(id, value);
    response.setHeader('Set-Cookie', `switchflow_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);
    onSessionChanged(value);
    return {name: user.name, email: user.email};
  }
  function restoreSession(value) {
    if (!value || !/^[a-f0-9]{64}$/.test(value.id) ||
        typeof value.cookie !== 'string' || !/^switch_auth=[A-Za-z0-9_.-]+$/.test(value.cookie) ||
        !value.user?.id || typeof value.user.email !== 'string' ||
        !Number.isFinite(value.expires) || value.expires <= Date.now()) return false;
    sessions.set(value.id,{id:value.id,cookie:value.cookie,user:value.user,expires:value.expires});
    return true;
  }
  async function refreshSessions() {
    for(const [id,value] of sessions){
      if(value.expires-Date.now()>8*60*60*1000)continue;
      try{
        const result=await fetch(`${baseUrl}/gateway/auth/refresh`,{method:'POST',headers:{Cookie:value.cookie},signal:AbortSignal.timeout(10000)});
        if(result.status===401){sessions.delete(id);onSessionChanged(null);continue;}
        if(!result.ok)continue;
        const cookie=result.headers.getSetCookie().map(item=>item.split(';')[0]).find(item=>item.startsWith('switch_auth='));
        if(!cookie)continue;
        value.cookie=cookie;value.expires=Date.now()+24*60*60*1000;
        onSessionChanged(value);
      }catch{/* Keep the current session when Switch is temporarily offline. */}
    }
  }
  function logout(request,response) {
    const id = /(?:^|;\s*)switchflow_session=([^;]+)/.exec(request.headers.cookie || '')?.[1];
    if(id) sessions.delete(id);
    response.setHeader('Set-Cookie','switchflow_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    onSessionChanged(null);
    return {ok:true};
  }
  async function joinRoom(request, roomId) {
    const current = session(request);
    if (!current.user.id) throw new Error('The signed-in Switch account has no ID.');
    return gateway(request, `/chats/${encodeURIComponent(roomId)}/members`, 'POST', {userId:current.user.id});
  }
  return {gateway, login, restoreSession, refreshSessions, logout, joinRoom, user: request => session(request).user};
}
