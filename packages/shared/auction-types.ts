export type AuctionPlayer = {
  id: string;
  name: string;
  role: "Batter" | "Bowler" | "All-Rounder" | "Wicketkeeper";
  basePriceLakhs: number;
  origin: string;
  image: string;
  accentFrom: string;
  accentTo: string;
};

export type AuctionTeam = {
  id: string;
  name: string;
  shortCode: string;
  purseLakhs: number;
  primaryColor: string;
  secondaryColor: string;
};

export type AuctionHistoryType = "nomination" | "bid" | "sold" | "unsold";

export type AuctionHistoryEntry = {
  id: number;
  type: AuctionHistoryType;
  playerId: string;
  playerName: string;
  teamId?: string;
  teamName?: string;
  amountLakhs?: number;
  label: string;
};

export type InitialAuctionState = {
  currentPlayerId: string;
  currentBidLakhs: number;
  highestBidderId: string | null;
  bidIncrementLakhs: number;
  countdownSeconds: number;
  bidHistory: AuctionHistoryEntry[];
};

export type AuctionRoomPhase = "idle" | "live" | "paused" | "sold" | "unsold" | "complete";
export type AuctionSaleOutcome = "sold" | "unsold" | null;
export type PersistedRoomStatus = "draft" | "live" | "paused" | "complete";

export type AuctionRoomTeamSnapshot = AuctionTeam & {
  totalSpentLakhs: number;
  purseRemainingLakhs: number;
};

export type AuctionRoomMemberSnapshot = {
  id: string;
  displayName: string;
  role: "host" | "participant" | "viewer";
  isHost: boolean;
  teamId: string | null;
  teamName: string | null;
  joinedAt: string;
};

export type AuctionLotLifecycleStatus = "pending" | "live" | "sold" | "unsold" | null;

export type AuctionRoomSnapshot = {
  roomId: string;
  roomName: string;
  roomStatus: PersistedRoomStatus;
  isPaused: boolean;
  lotNumber: number;
  totalLots: number;
  completedLots: number;
  soldLots: number;
  unsoldLots: number;
  currentPlayer: AuctionPlayer | null;
  currentLotId: string | null;
  currentLotStatus: AuctionLotLifecycleStatus;
  currentBidLakhs: number;
  highestBidderId: string | null;
  countdownRemainingSeconds: number;
  countdownDurationSeconds: number;
  bidIncrementLakhs: number;
  phase: AuctionRoomPhase;
  saleOutcome: AuctionSaleOutcome;
  teams: AuctionRoomTeamSnapshot[];
  members: AuctionRoomMemberSnapshot[];
  memberCount: number;
  bidHistory: AuctionHistoryEntry[];
  notice: string;
  hasNextPlayer: boolean;
};

export type AuctionRoomState = {
  databaseRoomId: string;
  roomId: string;
  roomName: string;
  roomStatus: PersistedRoomStatus;
  isPaused: boolean;
  players: AuctionPlayer[];
  teams: AuctionTeam[];
  teamPurseRemainingLakhs: Record<string, number>;
  members: AuctionRoomMemberSnapshot[];
  currentLotId: string | null;
  lotIds: string[];
  lotStatusById: Record<string, Exclude<AuctionLotLifecycleStatus, null>>;
  currentPlayerIndex: number;
  currentBidLakhs: number;
  highestBidderId: string | null;
  countdownRemainingSeconds: number;
  countdownDurationSeconds: number;
  bidIncrementLakhs: number;
  phase: AuctionRoomPhase;
  saleOutcome: AuctionSaleOutcome;
  bidHistory: AuctionHistoryEntry[];
  notice: string;
  nextHistoryEntryId: number;
  persistedBidsByLotId: Record<
    string,
    Array<{
      id: string;
      amount: number;
      createdAt: string;
      teamId: string;
      teamName: string;
    }>
  >;
  closedLotOutcomes: Record<string, "sold" | "unsold">;
  soldTeamByLotId: Record<string, string>;
  soldPriceByLotId: Record<string, number>;
  scheduledNextLotAt: number | null;
};
