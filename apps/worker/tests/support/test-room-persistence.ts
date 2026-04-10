import type { PersistedRoomRecord } from "@auction/shared";
import type {
  AuctionPlayer,
  AuctionRoomMemberSnapshot,
  AuctionTeam,
  PersistedRoomStatus,
} from "@auction/shared";
import type {
  PersistedLotHydration,
  PersistedRoomTeamHydration,
  RoomEnginePersistence,
  RoomHydrationData,
} from "@auction/shared";

type TestRoomPersistenceOptions = {
  roomCode?: string;
  roomName?: string;
  roomStatus?: PersistedRoomStatus;
  teamCount?: number;
  memberCount?: number;
  playerCount?: number;
  lowPurseTeamIndex?: number;
  lowPurseLakhs?: number;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createPlayer(index: number): AuctionPlayer {
  return {
    id: `player-${index + 1}`,
    name: `Player ${index + 1}`,
    role: index % 4 === 0 ? "Batter" : index % 4 === 1 ? "Bowler" : index % 4 === 2 ? "All-Rounder" : "Wicketkeeper",
    basePriceLakhs: 200 + index * 10,
    origin: "India",
    image: "/player-silhouette.svg",
    accentFrom: "#444444",
    accentTo: "#1a1a1a",
  };
}

function createTeam(index: number, lowPurseTeamIndex?: number, lowPurseLakhs?: number): PersistedRoomTeamHydration {
  const purseLakhs = 600;

  return {
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    shortCode: `T${index + 1}`,
    purseLakhs,
    purseRemainingLakhs:
      lowPurseTeamIndex === index && typeof lowPurseLakhs === "number"
        ? lowPurseLakhs
        : purseLakhs,
    primaryColor: "#2a2a2a",
    secondaryColor: "#101010",
  };
}

function createMembers(teams: AuctionTeam[], memberCount: number): AuctionRoomMemberSnapshot[] {
  return Array.from({ length: memberCount }, (_, index) => {
    const role =
      index === 0 ? "host" : index <= teams.length ? "participant" : "viewer";
    const team = role === "participant" ? teams[index - 1] ?? null : null;

    return {
      id: `member-${index + 1}`,
      displayName: index === 0 ? "Host User" : `User ${index + 1}`,
      role,
      isHost: index === 0,
      teamId: team?.id ?? null,
      teamName: team?.name ?? null,
      joinedAt: new Date(Date.UTC(2026, 3, 9, 10, index, 0)).toISOString(),
    };
  });
}

function createLots(players: AuctionPlayer[]): PersistedLotHydration[] {
  return players.map((player, index) => ({
    id: `lot-${index + 1}`,
    order: index + 1,
    status: "pending",
    soldToTeamId: null,
    soldPrice: null,
    startedAt: null,
    closedAt: null,
    player,
    bids: [],
  }));
}

export class TestRoomPersistence implements RoomEnginePersistence {
  private readonly hydration: RoomHydrationData;

  constructor(options: TestRoomPersistenceOptions = {}) {
    const players = Array.from(
      { length: options.playerCount ?? 3 },
      (_, index) => createPlayer(index),
    );
    const teams = Array.from(
      { length: options.teamCount ?? 4 },
      (_, index) => createTeam(index, options.lowPurseTeamIndex, options.lowPurseLakhs),
    );
    const lots = createLots(players);
    const roomStatus = options.roomStatus ?? "draft";

    const room: PersistedRoomRecord & {
      hostToken: string;
      timerEndsAt: string | null;
      pausedRemainingSeconds: number | null;
    } = {
      id: "db-room-1",
      code: options.roomCode ?? "ROOM42",
      name: options.roomName ?? "Test Auction Room",
      status: roomStatus,
      privacy: "private",
      isPaused: roomStatus === "paused",
      currentLotId: null,
      createdAt: new Date(Date.UTC(2026, 3, 9, 10, 0, 0)).toISOString(),
      updatedAt: new Date(Date.UTC(2026, 3, 9, 10, 0, 0)).toISOString(),
      totalLots: lots.length,
      soldLots: 0,
      unsoldLots: 0,
      hostToken: "host-token",
      timerEndsAt: null,
      pausedRemainingSeconds: roomStatus === "paused" ? 8 : null,
    };

    this.hydration = {
      room,
      roomId: room.code,
      lots,
      teams,
      members: createMembers(teams, options.memberCount ?? Math.max(teams.length + 1, 5)),
    };
  }

  getState() {
    return clone(this.hydration);
  }

  private syncRoomTotals() {
    this.hydration.room.soldLots = this.hydration.lots.filter((lot) => lot.status === "sold").length;
    this.hydration.room.unsoldLots = this.hydration.lots.filter((lot) => lot.status === "unsold").length;
    this.hydration.room.totalLots = this.hydration.lots.length;
    this.hydration.room.updatedAt = new Date().toISOString();
  }

  async getRoomHydrationData(roomCode: string): Promise<RoomHydrationData | null> {
    if (roomCode !== this.hydration.room.code) {
      return null;
    }

    return clone(this.hydration);
  }

  async persistBid(input: {
    roomId: string;
    lotId: string | null;
    playerId: string;
    teamId: string;
    amount: number;
    countdownEndsAt: string | null;
  }): Promise<void> {
    const lot = this.hydration.lots.find((entry) => entry.id === input.lotId);
    const team = this.hydration.teams.find((entry) => entry.id === input.teamId);

    if (!lot || !team) {
      return;
    }

    lot.bids.push({
      id: `bid-${lot.bids.length + 1}`,
      amount: input.amount,
      createdAt: new Date().toISOString(),
      teamId: input.teamId,
      teamName: team.name,
    });
    this.hydration.room.status = "live";
    this.hydration.room.isPaused = false;
    this.hydration.room.currentLotId = input.lotId;
    this.hydration.room.timerEndsAt = input.countdownEndsAt;
    this.hydration.room.pausedRemainingSeconds = null;
    this.syncRoomTotals();
  }

  async persistLotSettlement(input: {
    roomId: string;
    lotId: string | null;
    saleOutcome: "sold" | "unsold";
    soldToTeamId: string | null;
    soldPrice: number | null;
  }): Promise<void> {
    const lot = this.hydration.lots.find((entry) => entry.id === input.lotId);

    if (!lot) {
      return;
    }

    lot.status = input.saleOutcome;
    lot.soldToTeamId = input.soldToTeamId;
    lot.soldPrice = input.soldPrice;
    lot.closedAt = new Date().toISOString();

    if (input.saleOutcome === "sold" && input.soldToTeamId && typeof input.soldPrice === "number") {
      const team = this.hydration.teams.find((entry) => entry.id === input.soldToTeamId);

      if (team) {
        team.purseRemainingLakhs = Math.max(0, team.purseRemainingLakhs - input.soldPrice);
      }
    }

    this.hydration.room.currentLotId = input.lotId;
    this.hydration.room.isPaused = false;
    this.hydration.room.timerEndsAt = null;
    this.hydration.room.pausedRemainingSeconds = null;
    this.syncRoomTotals();
  }

  async persistNextLotActivation(input: {
    roomId: string;
    nextLotId: string | null;
    isComplete: boolean;
    countdownEndsAt: string | null;
  }): Promise<void> {
    this.hydration.room.currentLotId = input.nextLotId;
    this.hydration.room.timerEndsAt = input.countdownEndsAt;
    this.hydration.room.pausedRemainingSeconds = null;
    this.hydration.room.isPaused = false;
    this.hydration.room.status = input.isComplete ? "complete" : "live";

    if (input.nextLotId) {
      const lot = this.hydration.lots.find((entry) => entry.id === input.nextLotId);

      if (lot) {
        lot.status = "live";
        lot.startedAt ??= new Date().toISOString();
      }
    }

    this.syncRoomTotals();
  }

  async persistAuctionPause(input: {
    roomId: string;
    isPaused: boolean;
    countdownEndsAt: string | null;
    pausedRemainingSeconds: number | null;
  }): Promise<void> {
    this.hydration.room.isPaused = input.isPaused;
    this.hydration.room.status = input.isPaused ? "paused" : "live";
    this.hydration.room.timerEndsAt = input.countdownEndsAt;
    this.hydration.room.pausedRemainingSeconds = input.pausedRemainingSeconds;
    this.syncRoomTotals();
  }
}