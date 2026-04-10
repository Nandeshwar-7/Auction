import { formatLakhs } from "./auction-utils";
import type {
  AuctionHistoryEntry,
  AuctionRoomSnapshot,
  AuctionRoomState,
  AuctionRoomTeamSnapshot,
  AuctionTeam,
  PersistedRoomStatus,
} from "./auction-types";
import type {
  RoomEngine,
  RoomEngineFailure,
  RoomEnginePersistence,
  RoomEngineResult,
  RoomEngineSuccess,
} from "./room-engine";
import type {
  AuctionPausedEvent,
  AuctionResumedEvent,
  BidAcceptedEvent,
  LotStartedEvent,
  PlayerSoldEvent,
  PlayerUnsoldEvent,
  RoomErrorEvent,
  RoomSnapshotEvent,
  ServerToClientEvent,
  TimerUpdatedEvent,
} from "./room-events";
import { ROOM_EVENT_TYPES } from "./room-events";

type EngineDispatch = {
  roomId: string;
  events: ServerToClientEvent[];
};

const DEFAULT_COUNTDOWN_SECONDS = 15;
const AUTO_ADVANCE_DELAY_MS = 2200;

function getCurrentPlayer(state: AuctionRoomState) {
  if (state.currentPlayerIndex < 0) {
    return null;
  }

  return state.players[state.currentPlayerIndex] ?? null;
}

function getCurrentLotStatus(state: AuctionRoomState) {
  if (!state.currentLotId) {
    return null;
  }

  return state.lotStatusById[state.currentLotId] ?? null;
}

function getTeam(state: AuctionRoomState, teamId: string) {
  return state.teams.find((team) => team.id === teamId) ?? null;
}

function getRemainingPurse(state: AuctionRoomState, teamId: string) {
  return state.teamPurseRemainingLakhs[teamId] ?? 0;
}

function getNextPendingIndex(state: AuctionRoomState) {
  return state.lotIds.findIndex((lotId) => state.lotStatusById[lotId] === "pending");
}

function hasPendingLots(state: AuctionRoomState) {
  return getNextPendingIndex(state) !== -1;
}

function getCountdownEndsAt(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function scheduleNextLot(state: AuctionRoomState) {
  state.scheduledNextLotAt = Date.now() + AUTO_ADVANCE_DELAY_MS;
}

function appendHistory(state: AuctionRoomState, entry: Omit<AuctionHistoryEntry, "id">) {
  state.bidHistory = [
    {
      id: state.nextHistoryEntryId++,
      ...entry,
    },
    ...state.bidHistory,
  ];
}

function buildError(roomId: string | null, code: string, message: string): RoomErrorEvent {
  return {
    type: ROOM_EVENT_TYPES.roomError,
    roomId,
    code,
    message,
  };
}

function success(...events: ServerToClientEvent[]): RoomEngineSuccess {
  return {
    ok: true,
    events,
  };
}

function failure(roomId: string | null, code: string, message: string): RoomEngineFailure {
  return {
    ok: false,
    error: buildError(roomId, code, message),
  };
}

function computeRoomStatus(phase: AuctionRoomState["phase"]): PersistedRoomStatus {
  switch (phase) {
    case "paused":
      return "paused";
    case "complete":
      return "complete";
    case "idle":
      return "draft";
    default:
      return "live";
  }
}

function buildSnapshot(state: AuctionRoomState): AuctionRoomSnapshot {
  const currentPlayer = getCurrentPlayer(state);
  const currentLotStatus = getCurrentLotStatus(state);
  const nextPendingIndex = getNextPendingIndex(state);
  const lotNumber =
    state.currentPlayerIndex >= 0
      ? state.currentPlayerIndex + 1
      : nextPendingIndex >= 0
        ? nextPendingIndex + 1
        : state.players.length;
  const soldLots = Object.values(state.lotStatusById).filter((status) => status === "sold").length;
  const unsoldLots = Object.values(state.lotStatusById).filter((status) => status === "unsold").length;
  const completedLots = soldLots + unsoldLots;

  return {
    roomId: state.roomId,
    roomName: state.roomName,
    roomStatus: state.roomStatus,
    isPaused: state.isPaused,
    lotNumber,
    totalLots: state.players.length,
    completedLots,
    soldLots,
    unsoldLots,
    currentPlayer,
    currentLotId: state.currentLotId,
    currentLotStatus,
    currentBidLakhs: state.currentBidLakhs,
    highestBidderId: state.highestBidderId,
    countdownRemainingSeconds: state.countdownRemainingSeconds,
    countdownDurationSeconds: state.countdownDurationSeconds,
    bidIncrementLakhs: state.bidIncrementLakhs,
    phase: state.phase,
    saleOutcome: state.saleOutcome,
    teams: state.teams.map<AuctionRoomTeamSnapshot>((team) => {
      const purseRemainingLakhs = getRemainingPurse(state, team.id);

      return {
        ...team,
        totalSpentLakhs: team.purseLakhs - purseRemainingLakhs,
        purseRemainingLakhs,
      };
    }),
    members: state.members,
    memberCount: state.members.length,
    bidHistory: state.bidHistory,
    notice: state.notice,
    hasNextPlayer: hasPendingLots(state),
  };
}

function snapshotEvent(state: AuctionRoomState): RoomSnapshotEvent {
  return {
    type: ROOM_EVENT_TYPES.roomSnapshot,
    snapshot: buildSnapshot(state),
  };
}

function buildInitialHistory(state: AuctionRoomState, teams: AuctionTeam[]) {
  const timeline: AuctionHistoryEntry[] = [];
  let nextHistoryEntryId = 1;

  state.players.forEach((player, index) => {
    const lotId = state.lotIds[index];
    const lotStatus = state.lotStatusById[lotId];
    const bidEntries = state.persistedBidsByLotId[lotId] ?? [];

    if (lotStatus !== "pending" || bidEntries.length > 0) {
      timeline.push({
        id: nextHistoryEntryId++,
        type: "nomination",
        playerId: player.id,
        playerName: player.name,
        label: `Lot ${String(index + 1).padStart(2, "0")} opened for ${player.name}.`,
      });
    }

    bidEntries.forEach((bid) => {
      timeline.push({
        id: nextHistoryEntryId++,
        type: "bid",
        playerId: player.id,
        playerName: player.name,
        teamId: bid.teamId,
        teamName: bid.teamName,
        amountLakhs: bid.amount,
        label: `${bid.teamName} pushed the price to ${formatLakhs(bid.amount)}.`,
      });
    });

    const soldTeamId = state.soldTeamByLotId[lotId];
    const soldTeam = soldTeamId ? teams.find((team) => team.id === soldTeamId) ?? null : null;
    const soldPrice = state.soldPriceByLotId[lotId] ?? null;

    if (lotStatus === "sold" && soldTeam && soldPrice) {
      timeline.push({
        id: nextHistoryEntryId++,
        type: "sold",
        playerId: player.id,
        playerName: player.name,
        teamId: soldTeam.id,
        teamName: soldTeam.name,
        amountLakhs: soldPrice,
        label: `${player.name} sold to ${soldTeam.name} for ${formatLakhs(soldPrice)}.`,
      });
    }

    if (lotStatus === "unsold") {
      timeline.push({
        id: nextHistoryEntryId++,
        type: "unsold",
        playerId: player.id,
        playerName: player.name,
        label: `${player.name} closed unsold.`,
      });
    }
  });

  state.bidHistory = timeline.reverse();
  state.nextHistoryEntryId = nextHistoryEntryId;
}

function determineInitialPhase(
  roomStatus: PersistedRoomStatus,
  currentLotStatus: ReturnType<typeof getCurrentLotStatus>,
  hasPending: boolean,
) {
  if (roomStatus === "complete" && !hasPending) {
    return "complete" as const;
  }

  if (roomStatus === "paused" && currentLotStatus === "live") {
    return "paused" as const;
  }

  if (currentLotStatus === "live") {
    return "live" as const;
  }

  if (currentLotStatus === "sold") {
    return "sold" as const;
  }

  if (currentLotStatus === "unsold") {
    return "unsold" as const;
  }

  if (hasPending) {
    return "idle" as const;
  }

  return "complete" as const;
}

async function createInitialRoomState(
  persistence: RoomEnginePersistence,
  roomCode: string,
): Promise<AuctionRoomState | null> {
  const hydration = await persistence.getRoomHydrationData(roomCode);

  if (!hydration) {
    return null;
  }

  const currentLotIndex = hydration.room.currentLotId
    ? hydration.lots.findIndex((lot) => lot.id === hydration.room.currentLotId)
    : -1;
  const fallbackLiveIndex = hydration.lots.findIndex((lot) => lot.status === "live");
  const lastClosedIndex = hydration.lots.findLastIndex(
    (lot) => lot.status === "sold" || lot.status === "unsold",
  );
  const resolvedCurrentIndex =
    currentLotIndex >= 0 ? currentLotIndex : fallbackLiveIndex >= 0 ? fallbackLiveIndex : lastClosedIndex;
  const currentLot = resolvedCurrentIndex >= 0 ? hydration.lots[resolvedCurrentIndex] ?? null : null;
  const latestBid = currentLot?.bids.at(-1) ?? null;
  const roomStatus = hydration.room.status;
  const currentLotStatus =
    currentLot?.status ??
    (resolvedCurrentIndex >= 0
      ? hydration.lots[resolvedCurrentIndex]?.status ?? null
      : null);
  const phase = determineInitialPhase(
    roomStatus,
    currentLotStatus,
    hydration.lots.some((lot) => lot.status === "pending"),
  );

  let countdownRemainingSeconds = 0;

  if (currentLot?.status === "live") {
    if (roomStatus === "paused") {
      countdownRemainingSeconds = hydration.room.pausedRemainingSeconds ?? DEFAULT_COUNTDOWN_SECONDS;
    } else if (hydration.room.timerEndsAt) {
      countdownRemainingSeconds = Math.max(
        Math.ceil((new Date(hydration.room.timerEndsAt).getTime() - Date.now()) / 1000),
        0,
      );
    } else {
      countdownRemainingSeconds = DEFAULT_COUNTDOWN_SECONDS;
    }
  }

  const state: AuctionRoomState = {
    databaseRoomId: hydration.room.id,
    roomId: hydration.room.code,
    roomName: hydration.room.name,
    roomStatus,
    isPaused: hydration.room.isPaused,
    players: hydration.lots.map((lot) => lot.player),
    teams: hydration.teams.map((team) => ({
      id: team.id,
      name: team.name,
      shortCode: team.shortCode,
      purseLakhs: team.purseLakhs,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
    })),
    teamPurseRemainingLakhs: Object.fromEntries(
      hydration.teams.map((team) => [team.id, team.purseRemainingLakhs]),
    ),
    members: hydration.members,
    currentLotId: currentLot?.id ?? null,
    lotIds: hydration.lots.map((lot) => lot.id),
    lotStatusById: Object.fromEntries(hydration.lots.map((lot) => [lot.id, lot.status])),
    currentPlayerIndex: resolvedCurrentIndex,
    currentBidLakhs:
      latestBid?.amount ??
      currentLot?.soldPrice ??
      currentLot?.player.basePriceLakhs ??
      0,
    highestBidderId: latestBid?.teamId ?? currentLot?.soldToTeamId ?? null,
    countdownRemainingSeconds,
    countdownDurationSeconds: DEFAULT_COUNTDOWN_SECONDS,
    bidIncrementLakhs: 10,
    phase,
    saleOutcome:
      currentLot?.status === "sold" ? "sold" : currentLot?.status === "unsold" ? "unsold" : null,
    bidHistory: [],
    notice: "",
    nextHistoryEntryId: 1,
    persistedBidsByLotId: Object.fromEntries(hydration.lots.map((lot) => [lot.id, lot.bids])),
    closedLotOutcomes: Object.fromEntries(
      hydration.lots
        .filter((lot): lot is typeof lot & { status: "sold" | "unsold" } => {
          return lot.status === "sold" || lot.status === "unsold";
        })
        .map((lot) => [lot.id, lot.status]),
    ),
    soldTeamByLotId: Object.fromEntries(
      hydration.lots
        .filter((lot): lot is typeof lot & { soldToTeamId: string } => Boolean(lot.soldToTeamId))
        .map((lot) => [lot.id, lot.soldToTeamId]),
    ),
    soldPriceByLotId: Object.fromEntries(
      hydration.lots
        .filter((lot): lot is typeof lot & { soldPrice: number } => typeof lot.soldPrice === "number")
        .map((lot) => [lot.id, lot.soldPrice]),
    ),
    scheduledNextLotAt: null,
  };

  if (!state.currentLotId && lastClosedIndex >= 0) {
    state.currentLotId = state.lotIds[lastClosedIndex] ?? null;
  }

  buildInitialHistory(state, hydration.teams);

  if (!currentLot) {
    state.notice = hasPendingLots(state)
      ? ""
      : "All persisted auction lots have already been completed for this room.";
    state.phase = hasPendingLots(state) ? "idle" : "complete";
    state.roomStatus = computeRoomStatus(state.phase);
    state.isPaused = false;
    return state;
  }

  if (state.phase === "live") {
    state.notice = `Lot ${String(state.currentPlayerIndex + 1).padStart(2, "0")} is live. ${currentLot.player.name} opens at ${formatLakhs(currentLot.player.basePriceLakhs)}.`;
  } else if (state.phase === "paused") {
    state.notice = `Auction paused with ${currentLot.player.name} live on stage at ${formatLakhs(state.currentBidLakhs)}.`;
  } else if (state.saleOutcome === "sold" && state.highestBidderId) {
    const winningTeam = getTeam(state, state.highestBidderId);
    state.notice = winningTeam
      ? `${currentLot.player.name} SOLD to ${winningTeam.name} for ${formatLakhs(state.currentBidLakhs)}.`
      : `${currentLot.player.name} SOLD for ${formatLakhs(state.currentBidLakhs)}.`;
  } else if (state.saleOutcome === "unsold") {
    state.notice = `${currentLot.player.name} closed unsold.`;
  } else {
    state.notice = "The next player is preparing to enter the room feed.";
  }

  return state;
}

async function activateNextPendingLot(
  persistence: RoomEnginePersistence,
  room: AuctionRoomState,
): Promise<RoomEngineResult> {
  if (room.phase === "live" || room.phase === "paused") {
    return failure(
      room.roomId,
      "LOT_STILL_ACTIVE",
      "Wait until the current lot is closed before opening the next player.",
    );
  }

  const nextPlayerIndex = getNextPendingIndex(room);

  if (nextPlayerIndex === -1) {
    room.phase = "complete";
    room.roomStatus = "complete";
    room.isPaused = false;
    room.notice = "All persisted lots have been completed for this room.";
    room.countdownRemainingSeconds = 0;
    room.scheduledNextLotAt = null;

    await persistence.persistNextLotActivation({
      roomId: room.databaseRoomId,
      nextLotId: null,
      isComplete: true,
      countdownEndsAt: null,
    });

    return success(snapshotEvent(room));
  }

  room.currentPlayerIndex = nextPlayerIndex;
  room.currentLotId = room.lotIds[nextPlayerIndex] ?? null;
  room.highestBidderId = null;
  room.saleOutcome = null;
  room.phase = "live";
  room.roomStatus = "live";
  room.isPaused = false;
  room.countdownRemainingSeconds = room.countdownDurationSeconds;
  room.scheduledNextLotAt = null;

  if (room.currentLotId) {
    room.lotStatusById[room.currentLotId] = "live";
  }

  const nextPlayer = getCurrentPlayer(room);

  if (!nextPlayer || !room.currentLotId) {
    return failure(room.roomId, "PLAYER_NOT_FOUND", "Unable to activate the next persisted lot.");
  }

  room.currentBidLakhs = nextPlayer.basePriceLakhs;
  room.notice = `Lot ${String(room.currentPlayerIndex + 1).padStart(2, "0")} is live. ${nextPlayer.name} opens at ${formatLakhs(nextPlayer.basePriceLakhs)}.`;

  appendHistory(room, {
    type: "nomination",
    playerId: nextPlayer.id,
    playerName: nextPlayer.name,
    label: `Lot ${String(room.currentPlayerIndex + 1).padStart(2, "0")} opened for ${nextPlayer.name}.`,
  });

  const countdownEndsAt = getCountdownEndsAt(room.countdownDurationSeconds);

  await persistence.persistNextLotActivation({
    roomId: room.databaseRoomId,
    nextLotId: room.currentLotId,
    isComplete: false,
    countdownEndsAt,
  });

  return success(
    {
      type: ROOM_EVENT_TYPES.lotStarted,
      roomId: room.roomId,
      playerId: nextPlayer.id,
      amountLakhs: nextPlayer.basePriceLakhs,
      notice: room.notice,
    } satisfies LotStartedEvent,
    snapshotEvent(room),
  );
}

async function syncRoomMembers(
  persistence: RoomEnginePersistence,
  room: AuctionRoomState,
) {
  const hydration = await persistence.getRoomHydrationData(room.roomId);

  if (!hydration) {
    return;
  }

  room.members = hydration.members;
}

async function settleLot(
  persistence: RoomEnginePersistence,
  state: AuctionRoomState,
  outcome: "auto" | "sold" | "unsold",
): Promise<RoomEngineResult> {
  const currentPlayer = getCurrentPlayer(state);

  if (!currentPlayer || !state.currentLotId) {
    return failure(state.roomId, "NO_ACTIVE_LOT", "There is no current lot to close.");
  }

  if (state.phase !== "live" && state.phase !== "paused") {
    return failure(state.roomId, "LOT_NOT_ACTIVE", "Only an active lot can be closed.");
  }

  const resolvedOutcome = outcome === "auto" ? (state.highestBidderId ? "sold" : "unsold") : outcome;

  if (resolvedOutcome === "sold" && !state.highestBidderId) {
    return failure(
      state.roomId,
      "NO_WINNING_BID",
      "A sold result requires an active highest bidder before closing the lot.",
    );
  }

  state.countdownRemainingSeconds = 0;
  state.isPaused = false;
  state.roomStatus = "live";
  state.saleOutcome = resolvedOutcome;
  state.lotStatusById[state.currentLotId] = resolvedOutcome;
  state.scheduledNextLotAt = null;

  if (resolvedOutcome === "sold") {
    const winningTeam = getTeam(state, state.highestBidderId as string);

    if (!winningTeam) {
      return failure(state.roomId, "TEAM_NOT_FOUND", "The winning franchise could not be resolved.");
    }

    state.teamPurseRemainingLakhs[winningTeam.id] = Math.max(
      0,
      getRemainingPurse(state, winningTeam.id) - state.currentBidLakhs,
    );
    state.notice = `${currentPlayer.name} SOLD to ${winningTeam.name} for ${formatLakhs(state.currentBidLakhs)}.`;

    appendHistory(state, {
      type: "sold",
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      teamId: winningTeam.id,
      teamName: winningTeam.name,
      amountLakhs: state.currentBidLakhs,
      label: `${currentPlayer.name} sold to ${winningTeam.name} for ${formatLakhs(state.currentBidLakhs)}.`,
    });

    state.closedLotOutcomes[state.currentLotId] = "sold";
    state.soldTeamByLotId[state.currentLotId] = winningTeam.id;
    state.soldPriceByLotId[state.currentLotId] = state.currentBidLakhs;

    await persistence.persistLotSettlement({
      roomId: state.databaseRoomId,
      lotId: state.currentLotId,
      saleOutcome: "sold",
      soldToTeamId: winningTeam.id,
      soldPrice: state.currentBidLakhs,
    });

    const events: ServerToClientEvent[] = [
      {
        type: ROOM_EVENT_TYPES.playerSold,
        roomId: state.roomId,
        playerId: currentPlayer.id,
        teamId: winningTeam.id,
        amountLakhs: state.currentBidLakhs,
        notice: state.notice,
      } satisfies PlayerSoldEvent,
    ];

    if (!hasPendingLots(state)) {
      state.phase = "complete";
      state.roomStatus = "complete";
      state.notice = `Auction complete. ${currentPlayer.name} closed the final lot for ${formatLakhs(state.currentBidLakhs)}.`;

      await persistence.persistNextLotActivation({
        roomId: state.databaseRoomId,
        nextLotId: null,
        isComplete: true,
        countdownEndsAt: null,
      });
    } else {
      state.phase = "sold";
      scheduleNextLot(state);
      state.notice = `${currentPlayer.name} SOLD to ${winningTeam.name} for ${formatLakhs(state.currentBidLakhs)}. Next player incoming.`;
    }

    events.push(snapshotEvent(state));
    return success(...events);
  }

  state.highestBidderId = null;
  state.notice = `${currentPlayer.name} closed unsold.`;

  appendHistory(state, {
    type: "unsold",
    playerId: currentPlayer.id,
    playerName: currentPlayer.name,
    label: `${currentPlayer.name} closed unsold.`,
  });

  state.closedLotOutcomes[state.currentLotId] = "unsold";
  delete state.soldTeamByLotId[state.currentLotId];
  delete state.soldPriceByLotId[state.currentLotId];

  await persistence.persistLotSettlement({
    roomId: state.databaseRoomId,
    lotId: state.currentLotId,
    saleOutcome: "unsold",
    soldToTeamId: null,
    soldPrice: null,
  });

  const events: ServerToClientEvent[] = [
    {
      type: ROOM_EVENT_TYPES.playerUnsold,
      roomId: state.roomId,
      playerId: currentPlayer.id,
      amountLakhs: state.currentBidLakhs,
      notice: state.notice,
    } satisfies PlayerUnsoldEvent,
  ];

  if (!hasPendingLots(state)) {
    state.phase = "complete";
    state.roomStatus = "complete";
    state.notice = `Auction complete. ${currentPlayer.name} closed the final lot unsold.`;

    await persistence.persistNextLotActivation({
      roomId: state.databaseRoomId,
      nextLotId: null,
      isComplete: true,
      countdownEndsAt: null,
    });
  } else {
    state.phase = "unsold";
    scheduleNextLot(state);
    state.notice = `${currentPlayer.name} closed unsold. Next player incoming.`;
  }

  events.push(snapshotEvent(state));
  return success(...events);
}

export class InMemoryRoomEngine implements RoomEngine {
  private readonly rooms = new Map<string, AuctionRoomState>();
  private readonly persistence: RoomEnginePersistence;

  constructor(persistence: RoomEnginePersistence) {
    this.persistence = persistence;
  }

  private async getOrCreateRoom(roomCode: string) {
    const existingRoom = this.rooms.get(roomCode);

    if (existingRoom) {
      return existingRoom;
    }

    const room = await createInitialRoomState(this.persistence, roomCode);

    if (!room) {
      return null;
    }

    this.rooms.set(roomCode, room);
    return room;
  }

  async joinRoom(roomCode: string) {
    const trimmedRoomCode = roomCode.trim().toUpperCase();

    if (!trimmedRoomCode) {
      return failure(null, "INVALID_ROOM_ID", "A roomId is required to join a room.");
    }

    const room = await this.getOrCreateRoom(trimmedRoomCode);

    if (!room) {
      return failure(trimmedRoomCode, "ROOM_NOT_FOUND", "The requested room does not exist.");
    }

    await syncRoomMembers(this.persistence, room);

    return success(snapshotEvent(room));
  }

  async placeBid(roomCode: string, teamId: string) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return failure(roomCode, "ROOM_NOT_FOUND", "The requested room does not exist.");
    }

    if (room.phase !== "live") {
      return failure(roomCode, "BIDDING_CLOSED", "This lot is not accepting bids right now.");
    }

    const currentPlayer = getCurrentPlayer(room);

    if (!currentPlayer || !room.currentLotId) {
      return failure(roomCode, "PLAYER_NOT_FOUND", "No active player is available in this room.");
    }

    const team = getTeam(room, teamId);

    if (!team) {
      return failure(roomCode, "TEAM_NOT_FOUND", "The selected franchise does not exist in this room.");
    }

    if (room.highestBidderId === team.id) {
      return failure(roomCode, "ALREADY_LEADING", `${team.name} is already the highest bidder.`);
    }

    const nextBidLakhs = room.highestBidderId
      ? room.currentBidLakhs + room.bidIncrementLakhs
      : room.currentBidLakhs;
    const purseRemainingLakhs = getRemainingPurse(room, team.id);

    if (purseRemainingLakhs < nextBidLakhs) {
      return failure(
        roomCode,
        "INSUFFICIENT_PURSE",
        `${team.name} cannot cover ${formatLakhs(nextBidLakhs)} from the remaining purse.`,
      );
    }

    room.currentBidLakhs = nextBidLakhs;
    room.highestBidderId = team.id;
    room.countdownRemainingSeconds = room.countdownDurationSeconds;
    room.saleOutcome = null;
    room.phase = "live";
    room.roomStatus = "live";
    room.isPaused = false;
    room.notice = `${team.name} is now leading at ${formatLakhs(nextBidLakhs)}.`;

    appendHistory(room, {
      type: "bid",
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      teamId: team.id,
      teamName: team.name,
      amountLakhs: nextBidLakhs,
      label: `${team.name} pushed the price to ${formatLakhs(nextBidLakhs)}.`,
    });

    room.persistedBidsByLotId[room.currentLotId] = [
      ...(room.persistedBidsByLotId[room.currentLotId] ?? []),
      {
        id: `runtime-${Date.now()}`,
        amount: nextBidLakhs,
        createdAt: new Date().toISOString(),
        teamId: team.id,
        teamName: team.name,
      },
    ];

    const countdownEndsAt = getCountdownEndsAt(room.countdownDurationSeconds);

    await this.persistence.persistBid({
      roomId: room.databaseRoomId,
      lotId: room.currentLotId,
      playerId: currentPlayer.id,
      teamId: team.id,
      amount: nextBidLakhs,
      countdownEndsAt,
    });

    return success(
      {
        type: ROOM_EVENT_TYPES.bidAccepted,
        roomId: room.roomId,
        playerId: currentPlayer.id,
        bidderTeamId: team.id,
        amountLakhs: nextBidLakhs,
        notice: room.notice,
      } satisfies BidAcceptedEvent,
      snapshotEvent(room),
    );
  }

  async startAuction(roomCode: string) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return failure(roomCode, "ROOM_NOT_FOUND", "The requested room does not exist.");
    }

    if (room.roomStatus !== "draft" && room.phase !== "idle") {
      return failure(roomCode, "AUCTION_ALREADY_STARTED", "This room has already started the auction.");
    }

    return activateNextPendingLot(this.persistence, room);
  }

  async markSold(roomCode: string) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return failure(roomCode, "ROOM_NOT_FOUND", "The requested room does not exist.");
    }

    return settleLot(this.persistence, room, "sold");
  }

  async markUnsold(roomCode: string) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return failure(roomCode, "ROOM_NOT_FOUND", "The requested room does not exist.");
    }

    return settleLot(this.persistence, room, "unsold");
  }

  async pauseAuction(roomCode: string) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return failure(roomCode, "ROOM_NOT_FOUND", "The requested room does not exist.");
    }

    if (room.phase !== "live") {
      return failure(roomCode, "NOT_LIVE", "Only a live lot can be paused.");
    }

    room.phase = "paused";
    room.isPaused = true;
    room.roomStatus = "paused";
    room.notice = `Auction paused at ${formatLakhs(room.currentBidLakhs)}.`;

    await this.persistence.persistAuctionPause({
      roomId: room.databaseRoomId,
      isPaused: true,
      countdownEndsAt: null,
      pausedRemainingSeconds: room.countdownRemainingSeconds,
    });

    return success(
      {
        type: ROOM_EVENT_TYPES.auctionPaused,
        roomId: room.roomId,
        countdownRemainingSeconds: room.countdownRemainingSeconds,
        notice: room.notice,
      } satisfies AuctionPausedEvent,
      snapshotEvent(room),
    );
  }

  async resumeAuction(roomCode: string) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return failure(roomCode, "ROOM_NOT_FOUND", "The requested room does not exist.");
    }

    if (room.phase !== "paused") {
      return failure(roomCode, "NOT_PAUSED", "The current lot is not paused.");
    }

    room.phase = "live";
    room.isPaused = false;
    room.roomStatus = "live";
    room.notice = `Auction resumed with ${room.countdownRemainingSeconds} seconds on the clock.`;

    const countdownEndsAt = getCountdownEndsAt(room.countdownRemainingSeconds);

    await this.persistence.persistAuctionPause({
      roomId: room.databaseRoomId,
      isPaused: false,
      countdownEndsAt,
      pausedRemainingSeconds: null,
    });

    return success(
      {
        type: ROOM_EVENT_TYPES.auctionResumed,
        roomId: room.roomId,
        countdownRemainingSeconds: room.countdownRemainingSeconds,
        notice: room.notice,
      } satisfies AuctionResumedEvent,
      snapshotEvent(room),
    );
  }

  async closeCurrentLot(roomCode: string) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return failure(roomCode, "ROOM_NOT_FOUND", "The requested room does not exist.");
    }

    return settleLot(this.persistence, room, "auto");
  }

  async tick(): Promise<EngineDispatch[]> {
    const dispatches: EngineDispatch[] = [];

    for (const [roomId, room] of this.rooms.entries()) {
      if (
        (room.phase === "sold" || room.phase === "unsold") &&
        room.scheduledNextLotAt &&
        Date.now() >= room.scheduledNextLotAt
      ) {
        const result = await activateNextPendingLot(this.persistence, room);

        if (result.ok) {
          dispatches.push({
            roomId,
            events: result.events,
          });
        }

        continue;
      }

      if (room.phase !== "live") {
        continue;
      }

      if (room.countdownRemainingSeconds <= 0) {
        const result = await settleLot(this.persistence, room, "auto");

        if (result.ok) {
          dispatches.push({
            roomId,
            events: result.events,
          });
        }

        continue;
      }

      room.countdownRemainingSeconds -= 1;

      const events: ServerToClientEvent[] = [
        {
          type: ROOM_EVENT_TYPES.timerUpdated,
          roomId,
          countdownRemainingSeconds: room.countdownRemainingSeconds,
        } satisfies TimerUpdatedEvent,
      ];

      if (room.countdownRemainingSeconds === 0) {
        const result = await settleLot(this.persistence, room, "auto");

        if (result.ok) {
          events.push(...result.events);
        }
      }

      dispatches.push({
        roomId,
        events,
      });
    }

    return dispatches;
  }
}

export function createInMemoryRoomEngine(persistence: RoomEnginePersistence) {
  return new InMemoryRoomEngine(persistence);
}
