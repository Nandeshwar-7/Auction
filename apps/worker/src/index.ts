import type {
  CreateRoomRequest,
  GuestAuthRequest,
  JoinRoomRequest,
} from "@auction/shared";

import { parseCookies, buildSetCookieHeader, buildClearCookieHeader } from "./lib/cookies";
import {
  createSql,
  dbCreateGuestUserSession,
  dbCreateRoom,
  dbDeleteSession,
  dbGetRoomAccessForUser,
  dbGetRoomByCode,
  dbGetSessionUser,
  dbJoinRoomMembership,
  dbListPlayers,
  dbListTeams,
} from "./persistence/index";
import type { Env } from "./types";

export { RoomDurableObject } from "./room-do";

// ─── CORS ──────────────────────────────────────────────────────────────────────

const DEFAULT_ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000";

function allowedOriginList(env: Env): string[] {
  const raw = env.ALLOWED_ORIGINS?.trim();
  return (raw && raw.length > 0 ? raw : DEFAULT_ALLOWED_ORIGINS)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function isAllowedOrigin(env: Env, origin: string | null): boolean {
  if (!origin) return false;
  return allowedOriginList(env).includes(origin);
}

function corsHeaders(env: Env, origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
  if (origin && isAllowedOrigin(env, origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

function errorResponse(
  message: string,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return jsonResponse({ message }, status, extraHeaders);
}

// ─── Auth Helpers ──────────────────────────────────────────────────────────────

async function resolveSession(request: Request, env: Env) {
  const cookieName = env.SESSION_COOKIE_NAME ?? "auction_session";
  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies[cookieName] ?? null;
  const sql = createSql(env.DB);
  return dbGetSessionUser(sql, token);
}

// ─── Route Helpers ─────────────────────────────────────────────────────────────

function getRoomCodeFromPath(pathname: string, suffix = ""): string {
  const base = pathname.replace("/api/rooms/", "");
  return suffix ? base.replace(suffix, "") : base;
}

// ─── Main Fetch Handler ────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(env, origin);
    const sql = createSql(env.DB);

    // CORS preflight
    if (request.method === "OPTIONS") {
      if (origin && !isAllowedOrigin(env, origin)) {
        return new Response("Forbidden", { status: 403 });
      }
      return new Response(null, { status: 204, headers: cors });
    }

    // ── WebSocket upgrade (before generic origin gate; must clone Request, not rebuild from URL) ──
    if (url.pathname.startsWith("/api/rooms/") && url.pathname.endsWith("/ws")) {
      if (origin && !isAllowedOrigin(env, origin)) {
        return errorResponse("Origin not allowed.", 403, cors);
      }

      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader?.toLowerCase() !== "websocket") {
        return errorResponse("Expected WebSocket upgrade.", 426, cors);
      }

      const rawCode = decodeURIComponent(getRoomCodeFromPath(url.pathname, "/ws"));
      const roomCode = rawCode.trim().toUpperCase();

      const sessionData = await resolveSession(request, env);
      if (!sessionData) {
        return errorResponse("Sign in to join this room.", 401, cors);
      }

      const access = await dbGetRoomAccessForUser(sql, roomCode, sessionData.user.id);
      if (!access) {
        return errorResponse("You do not have access to this room.", 403, cors);
      }

      const doStub = env.AUCTION_ROOM.get(env.AUCTION_ROOM.idFromName(roomCode));

      const headers = new Headers(request.headers);
      headers.set("X-User-Id", sessionData.user.id);
      headers.set("X-Room-Role", access.role);
      headers.set("X-Assigned-Team-Id", access.assignedTeamId ?? "");
      headers.set("X-Can-Bid", String(access.canBid));
      headers.set("X-Can-Control-Auction", String(access.canControlAuction));
      headers.set("X-Room-Code", roomCode);

      // Rebuilding `new Request(url, { headers })` drops WebSocket upgrade state; clone from `request`.
      return doStub.fetch(new Request(request, { headers }));
    }

    // Block other cross-origin browser requests
    if (origin && !isAllowedOrigin(env, origin)) {
      return errorResponse("Origin not allowed.", 403);
    }

    try {
      // ── Health ────────────────────────────────────────────────────────────
      if (
        request.method === "GET" &&
        (url.pathname === "/health" || url.pathname === "/api/health")
      ) {
        return jsonResponse({ status: "ok" }, 200, cors);
      }

      // ── Auth: POST /api/auth/guest ─────────────────────────────────────────
      if (request.method === "POST" && url.pathname === "/api/auth/guest") {
        const body = (await request.json().catch(() => null)) as GuestAuthRequest | null;
        if (!body?.name) {
          return errorResponse("name is required.", 400, cors);
        }
        const session = await dbCreateGuestUserSession(sql, body);
        const cookieName = env.SESSION_COOKIE_NAME ?? "auction_session";
        const setCookie = buildSetCookieHeader(cookieName, session.sessionToken, session.expiresAt);
        return jsonResponse(
          { user: session.user },
          200,
          { ...cors, "Set-Cookie": setCookie },
        );
      }

      // ── Auth: GET /api/auth/session ────────────────────────────────────────
      if (request.method === "GET" && url.pathname === "/api/auth/session") {
        const sessionData = await resolveSession(request, env);
        return jsonResponse({ user: sessionData?.user ?? null }, 200, cors);
      }

      // ── Auth: POST /api/auth/logout ────────────────────────────────────────
      if (request.method === "POST" && url.pathname === "/api/auth/logout") {
        const cookieName = env.SESSION_COOKIE_NAME ?? "auction_session";
        const cookies = parseCookies(request.headers.get("Cookie"));
        const token = cookies[cookieName] ?? null;
        await dbDeleteSession(sql, token);
        const clearCookie = buildClearCookieHeader(cookieName);
        return jsonResponse({ ok: true }, 200, { ...cors, "Set-Cookie": clearCookie });
      }

      // ── Players: GET /api/players ─────────────────────────────────────────
      if (request.method === "GET" && url.pathname === "/api/players") {
        const players = await dbListPlayers(sql);
        return jsonResponse({ players }, 200, cors);
      }

      // ── Teams: GET /api/teams ─────────────────────────────────────────────
      if (request.method === "GET" && url.pathname === "/api/teams") {
        const teams = await dbListTeams(sql);
        return jsonResponse({ teams }, 200, cors);
      }

      // ── Rooms: POST /api/rooms ────────────────────────────────────────────
      if (request.method === "POST" && url.pathname === "/api/rooms") {
        const sessionData = await resolveSession(request, env);
        if (!sessionData) {
          return errorResponse("Sign in to create a room.", 401, cors);
        }
        const body = (await request.json().catch(() => null)) as CreateRoomRequest | null;
        const roomPayload = await dbCreateRoom(sql, body ?? {}, sessionData.user.id);
        return jsonResponse(roomPayload, 201, cors);
      }

      // ── Rooms: POST /api/rooms/join ───────────────────────────────────────
      if (request.method === "POST" && url.pathname === "/api/rooms/join") {
        const sessionData = await resolveSession(request, env);
        if (!sessionData) {
          return errorResponse("Sign in to join a room.", 401, cors);
        }
        const body = (await request.json().catch(() => null)) as JoinRoomRequest | null;
        if (!body?.code) {
          return errorResponse("code is required.", 400, cors);
        }
        const access = await dbJoinRoomMembership(sql, {
          code: body.code,
          userId: sessionData.user.id,
          role: body.role ?? "viewer",
          teamId: body.teamId,
        });
        if (!access) {
          return errorResponse("Room not found.", 404, cors);
        }
        return jsonResponse({ access }, 200, cors);
      }

      // ── Rooms: GET /api/rooms/:code/access ────────────────────────────────
      if (
        request.method === "GET" &&
        url.pathname.startsWith("/api/rooms/") &&
        url.pathname.endsWith("/access")
      ) {
        const sessionData = await resolveSession(request, env);
        if (!sessionData) {
          return errorResponse("Sign in to continue.", 401, cors);
        }
        const code = decodeURIComponent(getRoomCodeFromPath(url.pathname, "/access"))
          .trim()
          .toUpperCase();
        const access = await dbGetRoomAccessForUser(sql, code, sessionData.user.id);
        if (!access) {
          return errorResponse("You do not have access to this room.", 403, cors);
        }
        return jsonResponse({ access }, 200, cors);
      }

      // ── Rooms: GET /api/rooms/:code ───────────────────────────────────────
      if (request.method === "GET" && url.pathname.startsWith("/api/rooms/")) {
        const code = decodeURIComponent(getRoomCodeFromPath(url.pathname))
          .trim()
          .toUpperCase();
        const room = await dbGetRoomByCode(sql, code);
        if (!room) {
          return errorResponse("Room not found.", 404, cors);
        }
        return jsonResponse(room, 200, cors);
      }

      return new Response("IPL Auction Cloudflare Worker is running.", {
        status: 200,
        headers: cors,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error.";
      console.error("[worker]", message, error);
      return errorResponse(message, 500, cors);
    }
  },
};
