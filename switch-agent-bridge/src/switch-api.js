import WebSocket from "ws";

function errorText(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export class SwitchApi {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async request(path, { token, method = "GET", body, connectionId } = {}) {
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (connectionId) headers["X-Switch-Connection-Id"] = connectionId;

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed = text;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        // Keep non-JSON error bodies readable.
      }
    }
    if (!response.ok) {
      throw new Error(`${method} ${path} failed (${response.status}): ${errorText(parsed)}`);
    }
    return parsed;
  }

  health() {
    return this.request("/health");
  }

  register(role, registrationToken) {
    return this.request("/agents", {
      method: "POST",
      token: registrationToken,
      body: {
        name: role.name,
        display_name: role.displayName,
        description: role.description,
        connector_type: "switchflow-windows",
        overwrite: true,
        integration_profile: {
          connection_model: "always_on",
          message_exchange: true,
          pre_invocation_mediation: [],
          post_invocation_mediation: [],
          event_reporting: [],
        },
      },
    });
  }

  async operation(agent, name, args = {}, connectionId) {
    const response = await this.request(`/agents/${agent.id}/ops/${name}`, {
      method: "POST",
      token: agent.apiKey,
      body: args,
      connectionId,
    });
    return response?.result;
  }

  setAddressing(agent, addressing) {
    return this.operation(agent, "update_agent_detail", {
      agent_id: agent.id,
      addressing,
    });
  }

  async connectToRoom(agent, roomId, connectionId) {
    return this.operation(
      agent,
      "connect_to_room",
      { room_id: roomId, include_general_instructions: false },
      connectionId,
    );
  }

  async readContext(agent, roomId, connectionId, limit = 50) {
    return this.operation(
      agent,
      "read_context",
      { room_id: roomId, limit },
      connectionId,
    );
  }

  async downloadMedia(agent, roomId, mxc, maxBytes = 1_000_000) {
    if (typeof mxc !== "string" || !mxc.startsWith("mxc://")) {
      throw new Error("Switch provided an invalid attachment reference.");
    }
    const url = `${this.baseUrl}/agents/${encodeURIComponent(agent.id)}/rooms/${encodeURIComponent(roomId)}/media?mxc=${encodeURIComponent(mxc)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${agent.apiKey}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Switch could not download the attachment (${response.status}).`);
    const declared = Number(response.headers.get("content-length"));
    if (declared > maxBytes) {
      await response.body?.cancel();
      throw new Error("Chat files must be 1 MB or smaller.");
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxBytes) {
        await response.body.cancel().catch(() => {});
        throw new Error("Chat files must be 1 MB or smaller.");
      }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async postMessage(agent, roomId, body, connectionId, threadId = null) {
    if (connectionId) {
      await this.connectToRoom(agent, roomId, connectionId);
      return this.operation(
        agent,
        "post_message",
        { body, thread_id: threadId || null },
        connectionId,
      );
    }
    return this.request(`/agents/${agent.id}/message`, {
      method: "POST",
      token: agent.apiKey,
      body: { room_id: roomId, content: body },
    });
  }

  openSocket(agent, { connectionId, cursor = "head", onFrame, onClose, onError }) {
    const wsBase = this.baseUrl.replace(/^http/, "ws");
    const query = new URLSearchParams({
      connection_id: connectionId,
      scope: "all",
      filter: "all",
      start_from: String(cursor),
      client: "switchflow-windows",
      client_version: "0.1.0",
    });
    const socket = new WebSocket(
      `${wsBase}/agents/${agent.id}/connection/ws?${query}`,
      { headers: { Authorization: `Bearer ${agent.apiKey}` } },
    );
    socket.on("message", (raw) => {
      try {
        onFrame(JSON.parse(raw.toString()), socket);
      } catch (error) {
        onError(error);
      }
    });
    socket.on("close", onClose);
    socket.on("error", onError);
    return socket;
  }
}

export function messageFromFrame(frame) {
  if (frame?.event !== "message") return null;
  const event = frame.data ?? {};
  const payload = event.payload ?? {};
  return {
    sequence: frame.id ?? event.sequence ?? 0,
    roomId: event.room_id,
    messageId: payload.message_id,
    senderName: payload.sender_name ?? "unknown",
    senderType: payload.sender_kind ?? payload.sender_type ?? payload.author_type ?? "unknown",
    senderRole: payload.sender_role ?? null,
    senderId: payload.sender ?? null,
    attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
    body: payload.body ?? "",
    threadId: payload.thread_id ?? null,
    addressed: payload.addressed === true,
  };
}

