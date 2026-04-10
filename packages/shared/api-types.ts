import type { AuctionPlayer, AuctionTeam, PersistedRoomStatus } from "./auction-types";
import type { AuthUser, RoomParticipantRole, RoomPrivacyMode } from "./auth-types";

export type PersistedRoomRecord = {
  id: string;
  code: string;
  name: string;
  status: PersistedRoomStatus;
  privacy: RoomPrivacyMode;
  isPaused: boolean;
  currentLotId: string | null;
  createdAt: string;
  updatedAt: string;
  totalLots: number;
  soldLots: number;
  unsoldLots: number;
};

export type RoomAccessRecord = {
  room: PersistedRoomRecord;
  user: AuthUser;
  role: RoomParticipantRole;
  canBid: boolean;
  canControlAuction: boolean;
  inviteCode: string | null;
  assignedTeamId: string | null;
};

export type PlayersResponse = {
  players: AuctionPlayer[];
};

export type TeamsResponse = {
  teams: AuctionTeam[];
};

export type RoomResponse = {
  room: PersistedRoomRecord;
  claimedTeamIds: string[];
};

export type CreateRoomRequest = {
  code?: string;
  name?: string;
  privacy?: RoomPrivacyMode;
};

export type CreateRoomResponse = {
  room: PersistedRoomRecord;
  access: RoomAccessRecord;
};

export type JoinRoomRequest = {
  code: string;
  role: Exclude<RoomParticipantRole, "host">;
  teamId?: string | null;
};

export type JoinRoomResponse = {
  access: RoomAccessRecord;
};

export type RoomAccessResponse = {
  access: RoomAccessRecord;
};

export type GuestAuthRequest = {
  name: string;
  email?: string;
};

export type SessionResponse = {
  user: AuthUser | null;
};
