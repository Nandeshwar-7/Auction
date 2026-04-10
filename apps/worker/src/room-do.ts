import type {
  AuctionRoomState,
  ClientToServerEvent,
  RoomErrorEvent,
  ServerToClientEvent,
} from "@auction/shared";
import {
  ROOM_EVENT_TYPES,
  createInMemoryRoomEngine,
} from "@auction/shared";

import { createPostgresPersistence, createSql } from "./persistence/index";
import type { Env } from "./types";

// Per-socket metadata stored in DO memory (survives hibernation via tags, not RAM)
type ConnectedSession = {
  userId: string;
  role: string;
  assignedTeamId: string | null;
  canBid: boolean;
  canControlAuction: boolean;
  roomCode: string;
};

const AUTO_ADVANCE_DELAY_MS = 2200;
const TIMER_ALARM_INTERVAL_MS = 1000;

function buildRoomErrorEvent(
  roomId: string | null,
  code: string,
  message: string,
): RoomErrorEvent {
  return { type: ROOM_EVENT_TYPES.roomError, roomId, code, message };
}

function parseClientEvent(raw: string): ClientToServerEvent | null {
  try {
    return JSON.parse(raw) as ClientToServerEvent;
  } catch {
    return null;
  }
}

export class RoomDurableObject implements DurableObject {
  private state: AuctionRoomState | null = null;
  private roomCode: string | null = null;
  private pendingAlarmType: "tick" | "advance" | null = null;

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {}

  // ─── WebSocket Upgrade ──────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get("Upgrade");
    if (upgrade?.toLowerCase() === "websocket") {
      return this.handleWebSocketUpgrade(request);
    }
    return new Response("Not found", { status: 404 });
  }

  private handleWebSocketUpgrade(request: Request): Response {
    const { 0: client, 1: server } = new WebSocketPair();

    const sessionId = crypto.randomUUID();
    const session: ConnectedSession = {
      userId: request.headers.get("X-User-Id") ?? "",
      role: request.headers.get("X-Room-Role") ?? "viewer",
      assignedTeamId: request.headers.get("X-Assigned-Team-Id") || null,
      canBid: request.headers.get("X-Can-Bid") === "true",
      canControlAuction: request.headers.get("X-Can-Control-Auction") === "true",
      roomCode: request.headers.get("X-Room-Code") ?? "",
    };

    // Store session info in socket tag for hibernation-safe retrieval
    this.ctx.acceptWebSocket(server, [sessionId, JSON.stringify(session)]);

    return new Response(null, { status: 101, webSocket: client });
  }

  // ─── Hibernation Handlers ───────────────────────────────────────────────────

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    if (typeof rawMessage !== "string") return;

    const session = this.getSessionFromSocket(ws);
    if (!session) {
      ws.close(1011, "Session not found");
      return;
    }

    const event = parseClientEvent(rawMessage);
    if (!event) {
      ws.send(JSON.stringify(buildRoomErrorEvent(session.roomCode, "INVALID_EVENT", "Malformed event payload.")));
      return;
    }

    await this.dispatch(ws, session, event);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    ws.close();
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    ws.close(1011, "WebSocket error");
  }

  // ─── Alarm (1-second tick) ──────────────────────────────────────────────────

  async alarm(): Promise<void> {
    if (!this.state) {
      this.state = await this.loadState();
    }

    if (!this.state) return;

    if (this.pendingAlarmType === "advance" ||
        (this.state.phase === "sold" || this.state.phase === "unsold")) {
      await this.tryAutoAdvance();
      return;
    }

    if (this.state.phase !== "live") return;

    if (this.state.countdownRemainingSeconds <= 0) {
      await this.autoSettle();
      return;
    }

    this.state.countdownRemainingSeconds -= 1;

    const timerEvent: ServerToClientEvent = {
      type: ROOM_EVENT_TYPES.timerUpdated,
      roomId: this.state.roomId,
      countdownRemainingSeconds: this.state.countdownRemainingSeconds,
    };

    if (this.state.countdownRemainingSeconds === 0) {
      this.broadcast(timerEvent);
      await this.autoSettle();
    } else {
      this.broadcast(timerEvent);
      await this.saveState();
      this.scheduleTickAlarm();
    }
  }

  // ─── Event Dispatch ─────────────────────────────────────────────────────────

  private async dispatch(
    ws: WebSocket,
    session: ConnectedSession,
    event: ClientToServerEvent,
  ): Promise<void> {
    const roomCode = session.roomCode;

    switch (event.type) {
      case ROOM_EVENT_TYPES.joinRoom:
        await this.handleJoinRoom(ws, roomCode);
        break;

      case ROOM_EVENT_TYPES.placeBid: {
        if (!session.canBid || !session.assignedTeamId) {
          ws.send(JSON.stringify(buildRoomErrorEvent(roomCode, "FORBIDDEN", "You are not allowed to bid in this room.")));
          return;
        }
        await this.handleAction(ws, roomCode, () => this.getEngine().placeBid(roomCode, session.assignedTeamId!));
        break;
      }

      case ROOM_EVENT_TYPES.startAuction:
        if (!session.canControlAuction) {
          ws.send(JSON.stringify(buildRoomErrorEvent(roomCode, "FORBIDDEN", "Only the host can start the auction.")));
          return;
        }
        await this.handleAction(ws, roomCode, () => this.getEngine().startAuction(roomCode));
        break;

      case ROOM_EVENT_TYPES.markSold:
        if (!session.canControlAuction) {
          ws.send(JSON.stringify(buildRoomErrorEvent(roomCode, "FORBIDDEN", "Only the host can close lots.")));
          return;
        }
        await this.handleAction(ws, roomCode, () => this.getEngine().markSold(roomCode));
        break;

      case ROOM_EVENT_TYPES.markUnsold:
        if (!session.canControlAuction) {
          ws.send(JSON.stringify(buildRoomErrorEvent(roomCode, "FORBIDDEN", "Only the host can close lots.")));
          return;
        }
        await this.handleAction(ws, roomCode, () => this.getEngine().markUnsold(roomCode));
        break;

      case ROOM_EVENT_TYPES.pauseAuction:
        if (!session.canControlAuction) {
          ws.send(JSON.stringify(buildRoomErrorEvent(roomCode, "FORBIDDEN", "Only the host can pause the auction.")));
          return;
        }
        await this.handleAction(ws, roomCode, () => this.getEngine().pauseAuction(roomCode));
        break;

      case ROOM_EVENT_TYPES.resumeAuction:
        if (!session.canControlAuction) {
          ws.send(JSON.stringify(buildRoomErrorEvent(roomCode, "FORBIDDEN", "Only the host can resume the auction.")));
          return;
        }
        await this.handleAction(ws, roomCode, () => this.getEngine().resumeAuction(roomCode));
        break;

      case ROOM_EVENT_TYPES.closeCurrentLot:
        if (!session.canControlAuction) {
          ws.send(JSON.stringify(buildRoomErrorEvent(roomCode, "FORBIDDEN", "Only the host can close lots.")));
          return;
        }
        await this.handleAction(ws, roomCode, () => this.getEngine().closeCurrentLot(roomCode));
        break;

      default:
        ws.send(JSON.stringify(buildRoomErrorEvent(roomCode, "UNKNOWN_EVENT", "Unknown event type.")));
    }
  }

  private async handleJoinRoom(ws: WebSocket, roomCode: string): Promise<void> {
    await this.ensureRoomLoaded(roomCode);
    const result = await this.getEngine().joinRoom(roomCode);

    if (!result.ok) {
      ws.send(JSON.stringify(result.error));
      return;
    }

    // Send snapshot only to the joining socket
    for (const event of result.events) {
      ws.send(JSON.stringify(event));
    }

    await this.saveState();
  }

  private async handleAction(
    ws: WebSocket,
    roomCode: string,
    action: () => Promise<{ ok: true; events: ServerToClientEvent[] } | { ok: false; error: RoomErrorEvent }>,
  ): Promise<void> {
    await this.ensureRoomLoaded(roomCode);
    const result = await action();

    if (!result.ok) {
      ws.send(JSON.stringify(result.error));
      return;
    }

    this.broadcast(...result.events);
    await this.saveState();

    // Schedule alarm for live rooms (timer) and post-settlement (auto-advance)
    this.updateAlarmState();
  }

  // ─── Timer & Auto-Advance ───────────────────────────────────────────────────

  private async autoSettle(): Promise<void> {
    if (!this.state) return;
    const result = await this.getEngine().closeCurrentLot(this.state.roomId);
    if (result.ok) {
      this.broadcast(...result.events);
    }
    await this.saveState();
    this.updateAlarmState();
  }

  private async tryAutoAdvance(): Promise<void> {
    if (!this.state) return;
    if (this.state.phase !== "sold" && this.state.phase !== "unsold") return;
    if (!this.state.scheduledNextLotAt || Date.now() < this.state.scheduledNextLotAt) {
      // Re-schedule if not yet time
      if (this.state.scheduledNextLotAt) {
        const delay = Math.max(0, this.state.scheduledNextLotAt - Date.now());
        await this.ctx.storage.setAlarm(Date.now() + delay);
      }
      return;
    }
    // Trigger next lot via engine tick
    const dispatches = await this.getEngine().tick();
    for (const dispatch of dispatches) {
      this.broadcast(...dispatch.events);
    }
    await this.saveState();
    this.updateAlarmState();
  }

  private updateAlarmState(): void {
    if (!this.state) return;
    if (this.state.phase === "live" && this.state.countdownRemainingSeconds > 0) {
      this.scheduleTickAlarm();
    } else if (
      (this.state.phase === "sold" || this.state.phase === "unsold") &&
      this.state.scheduledNextLotAt
    ) {
      const delay = Math.max(0, this.state.scheduledNextLotAt - Date.now());
      void this.ctx.storage.setAlarm(Date.now() + delay);
    }
  }

  private scheduleTickAlarm(): void {
    void this.ctx.storage.setAlarm(Date.now() + TIMER_ALARM_INTERVAL_MS);
  }

  // ─── Room Engine ────────────────────────────────────────────────────────────

  private _engine: ReturnType<typeof createInMemoryRoomEngine> | null = null;

  private getEngine() {
    if (!this._engine) {
      const sql = createSql(this.env.DB);
      const persistence = createPostgresPersistence(sql);
      this._engine = createInMemoryRoomEngine(persistence);

      // Seed in-memory state so the engine doesn't need to re-hydrate
      if (this.state && this.roomCode) {
        (this._engine as unknown as { rooms: Map<string, AuctionRoomState> })
          .rooms.set(this.roomCode, this.state);
      }
    }
    return this._engine;
  }

  private async ensureRoomLoaded(roomCode: string): Promise<void> {
    if (this.roomCode === roomCode && this.state) return;

    this.roomCode = roomCode;
    this.state = await this.loadState();

    if (!this.state) {
      // Cold load from DB via engine
      await this.getEngine().joinRoom(roomCode);
      // After joinRoom the engine has the room; extract it
      const engineRooms = (this._engine as unknown as { rooms: Map<string, AuctionRoomState> }).rooms;
      this.state = engineRooms.get(roomCode) ?? null;
    } else {
      // Warm load: seed the engine with the cached state
      const engineRooms = (this._engine as unknown as { rooms: Map<string, AuctionRoomState> }).rooms;
      if (!engineRooms.has(roomCode)) {
        engineRooms.set(roomCode, this.state);
      }
    }
  }

  // ─── Durable State ──────────────────────────────────────────────────────────

  private async loadState(): Promise<AuctionRoomState | null> {
    const stored = await this.ctx.storage.get<AuctionRoomState>("state");
    return stored ?? null;
  }

  private async saveState(): Promise<void> {
    if (!this.state) return;
    if (this.roomCode) {
      const engineRooms = this._engine
        ? (this._engine as unknown as { rooms: Map<string, AuctionRoomState> }).rooms
        : null;
      const latestState = engineRooms?.get(this.roomCode);
      if (latestState) this.state = latestState;
    }
    await this.ctx.storage.put("state", this.state);
  }

  // ─── Broadcast ──────────────────────────────────────────────────────────────

  private broadcast(...events: ServerToClientEvent[]): void {
    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) {
      try {
        for (const event of events) {
          ws.send(JSON.stringify(event));
        }
      } catch {
        // stale socket — ignore
      }
    }
  }

  // ─── Session Helpers ────────────────────────────────────────────────────────

  private getSessionFromSocket(ws: WebSocket): ConnectedSession | null {
    const tags = this.ctx.getTags(ws);
    // tags[0] = sessionId, tags[1] = JSON.stringify(session)
    const sessionTag = tags[1];
    if (!sessionTag) return null;
    try {
      return JSON.parse(sessionTag) as ConnectedSession;
    } catch {
      return null;
    }
  }
}
