import type { RoomErrorEvent, ServerToClientEvent } from "./room-events";
import type { AuctionPlayer, AuctionRoomMemberSnapshot, AuctionTeam } from "./auction-types";
import type { PersistedRoomRecord } from "./api-types";

export type RoomEngineSuccess = {
  ok: true;
  events: ServerToClientEvent[];
};

export type RoomEngineFailure = {
  ok: false;
  error: RoomErrorEvent;
};

export type RoomEngineResult = RoomEngineSuccess | RoomEngineFailure;

export type PersistedLotHydration = {
  id: string;
  order: number;
  status: "pending" | "live" | "sold" | "unsold";
  soldToTeamId: string | null;
  soldPrice: number | null;
  startedAt: string | null;
  closedAt: string | null;
  player: AuctionPlayer;
  bids: Array<{
    id: string;
    amount: number;
    createdAt: string;
    teamId: string;
    teamName: string;
  }>;
};

export type PersistedRoomTeamHydration = AuctionTeam & {
  purseRemainingLakhs: number;
};

export type RoomHydrationData = {
  room: PersistedRoomRecord & {
    hostToken: string;
    timerEndsAt: string | null;
    pausedRemainingSeconds: number | null;
  };
  roomId: string;
  lots: PersistedLotHydration[];
  teams: PersistedRoomTeamHydration[];
  members: AuctionRoomMemberSnapshot[];
};

export interface RoomEnginePersistence {
  getRoomHydrationData(roomCode: string): Promise<RoomHydrationData | null>;
  persistBid(input: {
    roomId: string;
    lotId: string | null;
    playerId: string;
    teamId: string;
    amount: number;
    countdownEndsAt: string | null;
  }): Promise<void>;
  persistLotSettlement(input: {
    roomId: string;
    lotId: string | null;
    saleOutcome: "sold" | "unsold";
    soldToTeamId: string | null;
    soldPrice: number | null;
  }): Promise<void>;
  persistNextLotActivation(input: {
    roomId: string;
    nextLotId: string | null;
    isComplete: boolean;
    countdownEndsAt: string | null;
  }): Promise<void>;
  persistAuctionPause(input: {
    roomId: string;
    isPaused: boolean;
    countdownEndsAt: string | null;
    pausedRemainingSeconds: number | null;
  }): Promise<void>;
}

export interface RoomEngine {
  joinRoom(roomId: string): Promise<RoomEngineSuccess | RoomEngineFailure>;
  placeBid(roomId: string, teamId: string): Promise<RoomEngineResult>;
  startAuction(roomId: string): Promise<RoomEngineResult>;
  markSold(roomId: string): Promise<RoomEngineResult>;
  markUnsold(roomId: string): Promise<RoomEngineResult>;
  pauseAuction(roomId: string): Promise<RoomEngineResult>;
  resumeAuction(roomId: string): Promise<RoomEngineResult>;
  closeCurrentLot(roomId: string): Promise<RoomEngineResult>;
  tick(): Promise<Array<{
    roomId: string;
    events: ServerToClientEvent[];
  }>>;
}
