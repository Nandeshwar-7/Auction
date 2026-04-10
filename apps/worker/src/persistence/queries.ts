import type {
  AuctionPlayer,
  AuctionRoomMemberSnapshot,
  AuctionTeam,
  PersistedRoomStatus,
} from "@auction/shared";
import type {
  AuthUser,
  RoomParticipantRole,
  RoomPrivacyMode,
} from "@auction/shared";
import type {
  CreateRoomResponse,
  PersistedRoomRecord,
  RoomAccessRecord,
  RoomResponse,
} from "@auction/shared";
import type { RoomHydrationData } from "@auction/shared";
import { canBidForRole, canControlAuctionForRole } from "@auction/shared";

// postgres.js Sql instance — typed loosely to avoid import() type complexities
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Sql = any;

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapPlayerRole(role: string): AuctionPlayer["role"] {
  switch (role) {
    case "BATTER": return "Batter";
    case "BOWLER": return "Bowler";
    case "ALL_ROUNDER": return "All-Rounder";
    case "WICKETKEEPER": return "Wicketkeeper";
    default: return "Batter";
  }
}

function mapRoomStatus(status: string, isPaused: boolean): PersistedRoomStatus {
  if (isPaused) return "paused";
  switch (status) {
    case "DRAFT": return "draft";
    case "LIVE": return "live";
    case "COMPLETE": return "complete";
    default: return "draft";
  }
}

function mapRoomPrivacy(privacy: string): RoomPrivacyMode {
  return privacy === "PUBLIC" ? "public" : "private";
}

function mapParticipantRole(role: string): RoomParticipantRole {
  switch (role) {
    case "HOST": return "host";
    case "VIEWER": return "viewer";
    default: return "participant";
  }
}

function mapLotStatus(status: string) {
  switch (status) {
    case "PENDING": return "pending" as const;
    case "LIVE": return "live" as const;
    case "SOLD": return "sold" as const;
    case "UNSOLD": return "unsold" as const;
    default: return "pending" as const;
  }
}

function mapPlayer(p: Record<string, unknown>): AuctionPlayer {
  return {
    id: p.id as string,
    name: p.name as string,
    role: mapPlayerRole(p.role as string),
    origin: p.country as string,
    basePriceLakhs: p.basePrice as number,
    image: p.imageUrl as string,
    accentFrom: (p.accentFrom as string | null) ?? "#d7b46a",
    accentTo: (p.accentTo as string | null) ?? "#88d8d2",
  };
}

function mapTeam(t: Record<string, unknown>): AuctionTeam {
  return {
    id: t.id as string,
    shortCode: t.code as string,
    name: t.name as string,
    purseLakhs: t.purse as number,
    primaryColor: t.color as string,
    secondaryColor: (t.secondaryColor as string | null) ?? (t.color as string),
  };
}

function mapAuthUser(u: Record<string, unknown>): AuthUser {
  return {
    id: u.id as string,
    name: u.name as string,
    email: (u.email as string | null) ?? null,
    avatarUrl: (u.avatarUrl as string | null) ?? null,
    createdAt: u.createdAt instanceof Date
      ? (u.createdAt as Date).toISOString()
      : (u.createdAt as string),
  };
}

function mapRoomRecord(
  room: Record<string, unknown>,
  totalLots: number,
  soldLots: number,
  unsoldLots: number,
): PersistedRoomRecord {
  return {
    id: room.id as string,
    code: room.code as string,
    name: room.name as string,
    status: mapRoomStatus(room.status as string, room.isPaused as boolean),
    privacy: mapRoomPrivacy(room.privacy as string),
    isPaused: room.isPaused as boolean,
    currentLotId: (room.currentLotId as string | null) ?? null,
    createdAt: room.createdAt instanceof Date
      ? (room.createdAt as Date).toISOString()
      : (room.createdAt as string),
    updatedAt: room.updatedAt instanceof Date
      ? (room.updatedAt as Date).toISOString()
      : (room.updatedAt as string),
    totalLots,
    soldLots,
    unsoldLots,
  };
}

function buildRoomAccessRecord(input: {
  room: PersistedRoomRecord;
  user: AuthUser;
  role: RoomParticipantRole;
  assignedTeamId: string | null;
}): RoomAccessRecord {
  return {
    room: input.room,
    user: input.user,
    role: input.role,
    canBid: canBidForRole(input.role) && Boolean(input.assignedTeamId),
    canControlAuction: canControlAuctionForRole(input.role),
    inviteCode: input.role === "host" ? input.room.code : null,
    assignedTeamId: input.assignedTeamId,
  };
}

function sanitizeRoomCode(code: string) {
  return code.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
}

function createRandomRoomCode() {
  return `ROOM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function createHostToken() {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
}

function createSessionToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateId() {
  return crypto.randomUUID();
}

function shuffleItems<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

// ─── Auth Queries ─────────────────────────────────────────────────────────────

export async function dbCreateGuestUserSession(
  sql: Sql,
  input: { name: string; email?: string | null },
) {
  const trimmedName = input.name.trim();
  const trimmedEmail = input.email?.trim() || null;

  if (!trimmedName) throw new Error("A display name is required.");

  let user: Record<string, unknown>;

  if (trimmedEmail) {
    const existing = await sql`
      SELECT * FROM "User" WHERE "email" = ${trimmedEmail} LIMIT 1
    `;
    if (existing.length > 0) {
      const updated = await sql`
        UPDATE "User" SET "name" = ${trimmedName}
        WHERE "email" = ${trimmedEmail}
        RETURNING *
      `;
      user = updated[0] as Record<string, unknown>;
    } else {
      const created = await sql`
        INSERT INTO "User" ("id", "name", "email", "createdAt")
        VALUES (${generateId()}, ${trimmedName}, ${trimmedEmail}, NOW())
        RETURNING *
      `;
      user = created[0] as Record<string, unknown>;
    }
  } else {
    const created = await sql`
      INSERT INTO "User" ("id", "name", "createdAt")
      VALUES (${generateId()}, ${trimmedName}, NOW())
      RETURNING *
    `;
    user = created[0] as Record<string, unknown>;
  }

  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const session = await sql`
    INSERT INTO "Session" ("id", "userId", "token", "expiresAt", "createdAt")
    VALUES (${generateId()}, ${user.id as string}, ${token}, ${expiresAt}, NOW())
    RETURNING *
  `;

  return {
    user: mapAuthUser(user),
    sessionToken: (session[0] as Record<string, unknown>).token as string,
    expiresAt,
  };
}

export async function dbGetSessionUser(sql: Sql, token: string | null | undefined) {
  const t = token?.trim();
  if (!t) return null;

  const rows = await sql`
    SELECT s.*, u."id" AS "userId_", u."name" AS "userName", u."email" AS "userEmail",
           u."avatarUrl" AS "userAvatarUrl", u."createdAt" AS "userCreatedAt"
    FROM "Session" s
    JOIN "User" u ON u."id" = s."userId"
    WHERE s."token" = ${t}
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0] as Record<string, unknown>;
  const expiresAt = new Date(row.expiresAt as string);

  if (expiresAt.getTime() <= Date.now()) {
    await sql`DELETE FROM "Session" WHERE "token" = ${t}`.catch(() => null);
    return null;
  }

  return {
    user: mapAuthUser({
      id: row.userId_,
      name: row.userName,
      email: row.userEmail,
      avatarUrl: row.userAvatarUrl,
      createdAt: row.userCreatedAt,
    }),
    sessionToken: t,
    expiresAt,
  };
}

export async function dbDeleteSession(sql: Sql, token: string | null | undefined) {
  const t = token?.trim();
  if (!t) return;
  await sql`DELETE FROM "Session" WHERE "token" = ${t}`;
}

// ─── Catalog Queries ──────────────────────────────────────────────────────────

export async function dbListPlayers(sql: Sql): Promise<AuctionPlayer[]> {
  const rows = await sql`
    SELECT * FROM "Player" ORDER BY "createdAt" ASC, "name" ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapPlayer);
}

export async function dbListTeams(sql: Sql): Promise<AuctionTeam[]> {
  const rows = await sql`
    SELECT * FROM "Team" ORDER BY "createdAt" ASC, "name" ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapTeam);
}

// ─── Room Queries ─────────────────────────────────────────────────────────────

async function dbResolveUniqueRoomCode(sql: Sql, preferred?: string): Promise<string> {
  const pref = preferred ? sanitizeRoomCode(preferred) : "";
  if (pref) {
    const existing = await sql`SELECT "id" FROM "Room" WHERE "code" = ${pref} LIMIT 1`;
    if (existing.length === 0) return pref;
  }
  for (let i = 0; i < 20; i++) {
    const code = createRandomRoomCode();
    const existing = await sql`SELECT "id" FROM "Room" WHERE "code" = ${code} LIMIT 1`;
    if (existing.length === 0) return code;
  }
  throw new Error("Unable to allocate a unique room code.");
}

export async function dbCreateRoom(
  sql: Sql,
  input: { code?: string; name?: string; privacy?: RoomPrivacyMode },
  hostUserId: string,
): Promise<CreateRoomResponse> {
  const [players, teams, code, hostUsers] = await Promise.all([
    sql`SELECT * FROM "Player" ORDER BY "createdAt" ASC, "name" ASC`,
    sql`SELECT * FROM "Team" ORDER BY "createdAt" ASC, "name" ASC`,
    dbResolveUniqueRoomCode(sql, input.code),
    sql`SELECT * FROM "User" WHERE "id" = ${hostUserId} LIMIT 1`,
  ]);

  const hostUser = hostUsers[0] as Record<string, unknown> | undefined;
  if (!hostUser) throw new Error("The current user could not be resolved.");
  if (players.length === 0) throw new Error("Seed players before creating auction rooms.");
  if (teams.length === 0) throw new Error("Seed teams before creating auction rooms.");

  const roomName = input.name?.trim() || `Auction Room ${code}`;
  const privacy = input.privacy === "public" ? "PUBLIC" : "PRIVATE";
  const hostToken = createHostToken();
  const roomId = generateId();
  const now = new Date();

  await sql`
    INSERT INTO "Room" ("id", "code", "name", "status", "privacy", "hostUserId", "hostToken",
                        "isPaused", "createdAt", "updatedAt")
    VALUES (${roomId}, ${code}, ${roomName}, 'DRAFT', ${privacy}::"RoomPrivacy",
            ${hostUserId}, ${hostToken}, false, ${now}, ${now})
  `;

  const participantId = generateId();
  await sql`
    INSERT INTO "RoomParticipant" ("id", "roomId", "userId", "displayName", "isHost",
                                   "role", "joinedAt", "createdAt")
    VALUES (${participantId}, ${roomId}, ${hostUserId}, ${hostUser.name as string},
            true, 'HOST', ${now}, ${now})
  `;

  const teamRecords = teams as Record<string, unknown>[];
  for (const team of teamRecords) {
    await sql`
      INSERT INTO "RoomTeam" ("id", "roomId", "teamId", "purseRemaining", "createdAt", "updatedAt")
      VALUES (${generateId()}, ${roomId}, ${team.id as string}, ${team.purse as number}, ${now}, ${now})
    `;
  }

  const shuffledPlayers = shuffleItems(players as Record<string, unknown>[]);
  for (let i = 0; i < shuffledPlayers.length; i++) {
    const player = shuffledPlayers[i] as Record<string, unknown>;
    await sql`
      INSERT INTO "AuctionLot" ("id", "roomId", "playerId", "order", "status", "createdAt", "updatedAt")
      VALUES (${generateId()}, ${roomId}, ${player.id as string}, ${i + 1}, 'PENDING', ${now}, ${now})
    `;
  }

  const lots = await sql`SELECT "status" FROM "AuctionLot" WHERE "roomId" = ${roomId}`;
  const roomRecord = mapRoomRecord({ id: roomId, code, name: roomName, status: "DRAFT",
    privacy, isPaused: false, currentLotId: null, createdAt: now, updatedAt: now },
    lots.length, 0, 0);

  return {
    room: roomRecord,
    access: buildRoomAccessRecord({
      room: roomRecord,
      user: mapAuthUser(hostUser),
      role: "host",
      assignedTeamId: null,
    }),
  };
}

export async function dbGetRoomByCode(sql: Sql, code: string): Promise<RoomResponse | null> {
  const normalized = sanitizeRoomCode(code);
  if (!normalized) return null;

  const rooms = await sql`SELECT * FROM "Room" WHERE "code" = ${normalized} LIMIT 1`;
  if (rooms.length === 0) return null;

  const room = rooms[0] as Record<string, unknown>;
  const lots = await sql`
    SELECT "status" FROM "AuctionLot" WHERE "roomId" = ${room.id as string}
  `;
  const claimedRows = await sql`
    SELECT DISTINCT "teamId" FROM "RoomParticipant"
    WHERE "roomId" = ${room.id as string} AND "teamId" IS NOT NULL
  `;

  const soldLots = (lots as Record<string, unknown>[]).filter(l => l.status === "SOLD").length;
  const unsoldLots = (lots as Record<string, unknown>[]).filter(l => l.status === "UNSOLD").length;

  return {
    room: mapRoomRecord(room, lots.length, soldLots, unsoldLots),
    claimedTeamIds: (claimedRows as Record<string, unknown>[]).map(r => r.teamId as string),
  };
}

export async function dbJoinRoomMembership(
  sql: Sql,
  input: {
    code: string;
    userId: string;
    role: Exclude<RoomParticipantRole, "host">;
    teamId?: string | null;
  },
): Promise<RoomAccessRecord | null> {
  const normalized = sanitizeRoomCode(input.code);
  if (!normalized) return null;

  const normalizedTeamId = input.teamId?.trim() || null;

  const [rooms, users] = await Promise.all([
    sql`SELECT * FROM "Room" WHERE "code" = ${normalized} LIMIT 1`,
    sql`SELECT * FROM "User" WHERE "id" = ${input.userId} LIMIT 1`,
  ]);

  const room = rooms[0] as Record<string, unknown> | undefined;
  const user = users[0] as Record<string, unknown> | undefined;
  if (!room || !user) return null;

  if (input.role === "participant" && !normalizedTeamId) {
    throw new Error("Choose a franchise before joining the room as a bidder.");
  }

  const existingParticipants = await sql`
    SELECT * FROM "RoomParticipant"
    WHERE "roomId" = ${room.id as string} AND "userId" = ${input.userId}
    LIMIT 1
  `;
  const existing = existingParticipants[0] as Record<string, unknown> | undefined;
  const lockedTeamId = (existing?.teamId as string | null) ?? null;
  const assignedTeamId = lockedTeamId ?? (input.role === "participant" ? normalizedTeamId : null);

  if (assignedTeamId) {
    const teamExists = await sql`
      SELECT "teamId" FROM "RoomTeam"
      WHERE "roomId" = ${room.id as string} AND "teamId" = ${assignedTeamId}
      LIMIT 1
    `;
    if (teamExists.length === 0) {
      throw new Error("The selected franchise is not available in this auction room.");
    }

    const takenBy = await sql`
      SELECT "displayName" FROM "RoomParticipant"
      WHERE "roomId" = ${room.id as string} AND "teamId" = ${assignedTeamId}
        ${existing ? sql`AND "id" != ${existing.id as string}` : sql``}
      LIMIT 1
    `;
    if (takenBy.length > 0) {
      throw new Error(`That franchise is already locked to ${(takenBy[0] as Record<string, unknown>).displayName} in this room.`);
    }
  }

  if (lockedTeamId && normalizedTeamId && lockedTeamId !== normalizedTeamId) {
    throw new Error("Your franchise is already locked for this room and cannot be changed.");
  }

  const now = new Date();

  if (!existing) {
    const dbRole = input.role === "viewer" ? "VIEWER" : "PARTICIPANT";
    await sql`
      INSERT INTO "RoomParticipant" ("id", "roomId", "userId", "teamId", "displayName",
                                     "isHost", "role", "joinedAt", "createdAt")
      VALUES (${generateId()}, ${room.id as string}, ${input.userId}, ${assignedTeamId},
              ${user.name as string}, false, ${dbRole}::"RoomParticipantRole", ${now}, ${now})
    `;
  } else if (existing.role !== "HOST") {
    const nextRole = (existing.teamId || input.role === "participant") ? "PARTICIPANT" : (input.role === "viewer" ? "VIEWER" : "PARTICIPANT");
    await sql`
      UPDATE "RoomParticipant"
      SET "role" = ${nextRole}::"RoomParticipantRole", "displayName" = ${user.name as string},
          "teamId" = ${assignedTeamId}
      WHERE "id" = ${existing.id as string}
    `;
  }

  const lots = await sql`SELECT "status" FROM "AuctionLot" WHERE "roomId" = ${room.id as string}`;
  const soldLots = (lots as Record<string, unknown>[]).filter(l => l.status === "SOLD").length;
  const unsoldLots = (lots as Record<string, unknown>[]).filter(l => l.status === "UNSOLD").length;
  const roomRecord = mapRoomRecord(room, lots.length, soldLots, unsoldLots);

  const resolvedRole: RoomParticipantRole =
    existing?.role === "HOST" ? "host" : assignedTeamId ? "participant" : input.role;

  return buildRoomAccessRecord({
    room: roomRecord,
    user: mapAuthUser(user),
    role: resolvedRole,
    assignedTeamId,
  });
}

export async function dbGetRoomAccessForUser(
  sql: Sql,
  code: string,
  userId: string,
): Promise<RoomAccessRecord | null> {
  const normalized = sanitizeRoomCode(code);
  if (!normalized) return null;

  const [rooms, users] = await Promise.all([
    sql`SELECT * FROM "Room" WHERE "code" = ${normalized} LIMIT 1`,
    sql`SELECT * FROM "User" WHERE "id" = ${userId} LIMIT 1`,
  ]);

  const room = rooms[0] as Record<string, unknown> | undefined;
  const user = users[0] as Record<string, unknown> | undefined;
  if (!room || !user) return null;

  const lots = await sql`SELECT "status" FROM "AuctionLot" WHERE "roomId" = ${room.id as string}`;
  const soldLots = (lots as Record<string, unknown>[]).filter(l => l.status === "SOLD").length;
  const unsoldLots = (lots as Record<string, unknown>[]).filter(l => l.status === "UNSOLD").length;
  const roomRecord = mapRoomRecord(room, lots.length, soldLots, unsoldLots);

  const participants = await sql`
    SELECT * FROM "RoomParticipant"
    WHERE "roomId" = ${room.id as string} AND "userId" = ${userId}
    LIMIT 1
  `;

  if (participants.length > 0) {
    const p = participants[0] as Record<string, unknown>;
    return buildRoomAccessRecord({
      room: roomRecord,
      user: mapAuthUser(user),
      role: mapParticipantRole(p.role as string),
      assignedTeamId: (p.teamId as string | null) ?? null,
    });
  }

  if (room.privacy === "PUBLIC") {
    return buildRoomAccessRecord({
      room: roomRecord,
      user: mapAuthUser(user),
      role: "viewer",
      assignedTeamId: null,
    });
  }

  return null;
}

// ─── Room Hydration (RoomEnginePersistence) ───────────────────────────────────

export async function dbGetRoomHydrationData(
  sql: Sql,
  code: string,
): Promise<RoomHydrationData | null> {
  const normalized = sanitizeRoomCode(code);
  if (!normalized) return null;

  const rooms = await sql`SELECT * FROM "Room" WHERE "code" = ${normalized} LIMIT 1`;
  if (rooms.length === 0) return null;

  const room = rooms[0] as Record<string, unknown>;

  const [lots, roomTeams, participants] = await Promise.all([
    sql`
      SELECT al.*, p."id" AS "pId", p."name" AS "pName", p."role" AS "pRole",
             p."country" AS "pCountry", p."basePrice" AS "pBasePrice",
             p."imageUrl" AS "pImageUrl", p."accentFrom" AS "pAccentFrom",
             p."accentTo" AS "pAccentTo"
      FROM "AuctionLot" al
      JOIN "Player" p ON p."id" = al."playerId"
      WHERE al."roomId" = ${room.id as string}
      ORDER BY al."order" ASC
    `,
    sql`
      SELECT rt.*, t."id" AS "tId", t."code" AS "tCode", t."name" AS "tName",
             t."purse" AS "tPurse", t."color" AS "tColor", t."secondaryColor" AS "tSecondaryColor"
      FROM "RoomTeam" rt
      JOIN "Team" t ON t."id" = rt."teamId"
      WHERE rt."roomId" = ${room.id as string}
      ORDER BY rt."createdAt" ASC
    `,
    sql`
      SELECT rp.*, t."name" AS "teamName"
      FROM "RoomParticipant" rp
      LEFT JOIN "Team" t ON t."id" = rp."teamId"
      WHERE rp."roomId" = ${room.id as string}
      ORDER BY rp."joinedAt" ASC
    `,
  ]);

  const lotIds = (lots as Record<string, unknown>[]).map(l => l.id as string);
  let bidsMap: Record<string, Array<{ id: string; amount: number; createdAt: string; teamId: string; teamName: string }>> = {};

  if (lotIds.length > 0) {
    const bids = await sql`
      SELECT b.*, t."name" AS "teamName"
      FROM "Bid" b
      JOIN "Team" t ON t."id" = b."teamId"
      WHERE b."lotId" = ANY(${lotIds})
      ORDER BY b."createdAt" ASC
    `;

    for (const bid of bids as Record<string, unknown>[]) {
      const lotId = bid.lotId as string;
      if (!bidsMap[lotId]) bidsMap[lotId] = [];
      bidsMap[lotId]!.push({
        id: bid.id as string,
        amount: bid.amount as number,
        createdAt: bid.createdAt instanceof Date
          ? (bid.createdAt as Date).toISOString()
          : (bid.createdAt as string),
        teamId: bid.teamId as string,
        teamName: bid.teamName as string,
      });
    }
  }

  const soldLots = (lots as Record<string, unknown>[]).filter(l => l.status === "SOLD").length;
  const unsoldLots = (lots as Record<string, unknown>[]).filter(l => l.status === "UNSOLD").length;

  return {
    room: {
      ...mapRoomRecord(room, lots.length, soldLots, unsoldLots),
      hostToken: room.hostToken as string,
      timerEndsAt: room.timerEndsAt
        ? (room.timerEndsAt instanceof Date
          ? (room.timerEndsAt as Date).toISOString()
          : (room.timerEndsAt as string))
        : null,
      pausedRemainingSeconds: (room.pausedRemainingSeconds as number | null) ?? null,
    },
    roomId: room.id as string,
    teams: (roomTeams as Record<string, unknown>[]).map(rt => ({
      id: rt.tId as string,
      shortCode: rt.tCode as string,
      name: rt.tName as string,
      purseLakhs: rt.tPurse as number,
      primaryColor: rt.tColor as string,
      secondaryColor: (rt.tSecondaryColor as string | null) ?? (rt.tColor as string),
      purseRemainingLakhs: rt.purseRemaining as number,
    })),
    members: (participants as Record<string, unknown>[]).map<AuctionRoomMemberSnapshot>(p => ({
      id: p.id as string,
      displayName: p.displayName as string,
      role: mapParticipantRole(p.role as string) as AuctionRoomMemberSnapshot["role"],
      isHost: p.isHost as boolean,
      teamId: (p.teamId as string | null) ?? null,
      teamName: (p.teamName as string | null) ?? null,
      joinedAt: p.joinedAt instanceof Date
        ? (p.joinedAt as Date).toISOString()
        : (p.joinedAt as string),
    })),
    lots: (lots as Record<string, unknown>[]).map(lot => ({
      id: lot.id as string,
      order: lot.order as number,
      status: mapLotStatus(lot.status as string),
      soldToTeamId: (lot.soldToTeamId as string | null) ?? null,
      soldPrice: (lot.soldPrice as number | null) ?? null,
      startedAt: lot.startedAt
        ? (lot.startedAt instanceof Date ? (lot.startedAt as Date).toISOString() : (lot.startedAt as string))
        : null,
      closedAt: lot.closedAt
        ? (lot.closedAt instanceof Date ? (lot.closedAt as Date).toISOString() : (lot.closedAt as string))
        : null,
      player: mapPlayer({
        id: lot.pId, name: lot.pName, role: lot.pRole, country: lot.pCountry,
        basePrice: lot.pBasePrice, imageUrl: lot.pImageUrl,
        accentFrom: lot.pAccentFrom, accentTo: lot.pAccentTo,
      }),
      bids: bidsMap[lot.id as string] ?? [],
    })),
  };
}

export async function dbPersistBid(
  sql: Sql,
  input: {
    roomId: string;
    lotId: string | null;
    playerId: string;
    teamId: string;
    amount: number;
    countdownEndsAt: string | null;
  },
) {
  const timerEndsAt = input.countdownEndsAt ? new Date(input.countdownEndsAt) : null;

  await sql`
    INSERT INTO "Bid" ("id", "roomId", "lotId", "playerId", "teamId", "amount", "createdAt")
    VALUES (${generateId()}, ${input.roomId}, ${input.lotId}, ${input.playerId},
            ${input.teamId}, ${input.amount}, NOW())
  `;

  await sql`
    UPDATE "Room"
    SET "status" = 'LIVE', "isPaused" = false,
        "timerEndsAt" = ${timerEndsAt}, "pausedRemainingSeconds" = null,
        "updatedAt" = NOW()
    WHERE "id" = ${input.roomId}
  `;
}

export async function dbPersistLotSettlement(
  sql: Sql,
  input: {
    roomId: string;
    lotId: string | null;
    saleOutcome: "sold" | "unsold";
    soldToTeamId: string | null;
    soldPrice: number | null;
  },
) {
  if (!input.lotId) return;

  const newStatus = input.saleOutcome === "sold" ? "SOLD" : "UNSOLD";

  await sql`
    UPDATE "AuctionLot"
    SET "status" = ${newStatus}::"AuctionLotStatus", "soldToTeamId" = ${input.soldToTeamId},
        "soldPrice" = ${input.soldPrice}, "closedAt" = NOW(), "updatedAt" = NOW()
    WHERE "id" = ${input.lotId}
  `;

  await sql`
    UPDATE "Room"
    SET "status" = 'LIVE', "isPaused" = false,
        "timerEndsAt" = null, "pausedRemainingSeconds" = null,
        "updatedAt" = NOW()
    WHERE "id" = ${input.roomId}
  `;

  if (input.saleOutcome === "sold" && input.soldToTeamId && input.soldPrice) {
    await sql`
      UPDATE "RoomTeam"
      SET "purseRemaining" = "purseRemaining" - ${input.soldPrice}, "updatedAt" = NOW()
      WHERE "roomId" = ${input.roomId} AND "teamId" = ${input.soldToTeamId}
    `;
  }
}

export async function dbPersistNextLotActivation(
  sql: Sql,
  input: {
    roomId: string;
    nextLotId: string | null;
    isComplete: boolean;
    countdownEndsAt: string | null;
  },
) {
  if (input.isComplete) {
    await sql`
      UPDATE "Room"
      SET "status" = 'COMPLETE', "currentLotId" = null, "isPaused" = false,
          "timerEndsAt" = null, "pausedRemainingSeconds" = null, "updatedAt" = NOW()
      WHERE "id" = ${input.roomId}
    `;
    return;
  }

  if (!input.nextLotId) return;

  const timerEndsAt = input.countdownEndsAt ? new Date(input.countdownEndsAt) : null;

  await sql`
    UPDATE "Room"
    SET "status" = 'LIVE', "currentLotId" = ${input.nextLotId}, "isPaused" = false,
        "timerEndsAt" = ${timerEndsAt}, "pausedRemainingSeconds" = null, "updatedAt" = NOW()
    WHERE "id" = ${input.roomId}
  `;

  await sql`
    UPDATE "AuctionLot"
    SET "status" = 'LIVE', "startedAt" = NOW(), "closedAt" = null,
        "soldPrice" = null, "soldToTeamId" = null, "updatedAt" = NOW()
    WHERE "id" = ${input.nextLotId}
  `;
}

export async function dbPersistAuctionPause(
  sql: Sql,
  input: {
    roomId: string;
    isPaused: boolean;
    countdownEndsAt: string | null;
    pausedRemainingSeconds: number | null;
  },
) {
  const timerEndsAt = input.countdownEndsAt ? new Date(input.countdownEndsAt) : null;

  await sql`
    UPDATE "Room"
    SET "isPaused" = ${input.isPaused},
        "timerEndsAt" = ${timerEndsAt},
        "pausedRemainingSeconds" = ${input.pausedRemainingSeconds},
        "updatedAt" = NOW()
    WHERE "id" = ${input.roomId}
  `;
}
