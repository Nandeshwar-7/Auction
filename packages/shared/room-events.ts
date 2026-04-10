import type { AuctionRoomSnapshot } from "./auction-types";

export const ROOM_EVENT_TYPES = {
  joinRoom: "join_room",
  placeBid: "place_bid",
  startAuction: "start_auction",
  markSold: "mark_sold",
  markUnsold: "mark_unsold",
  pauseAuction: "pause_auction",
  resumeAuction: "resume_auction",
  closeCurrentLot: "close_current_lot",
  roomSnapshot: "room_snapshot",
  bidAccepted: "bid_accepted",
  timerUpdated: "timer_updated",
  lotStarted: "lot_started",
  playerSold: "player_sold",
  playerUnsold: "player_unsold",
  auctionPaused: "auction_paused",
  auctionResumed: "auction_resumed",
  roomError: "room_error",
} as const;

export type JoinRoomEvent = {
  type: (typeof ROOM_EVENT_TYPES)["joinRoom"];
  roomId: string;
};

export type PlaceBidEvent = {
  type: (typeof ROOM_EVENT_TYPES)["placeBid"];
  roomId: string;
  teamId: string;
};

export type StartAuctionEvent = {
  type: (typeof ROOM_EVENT_TYPES)["startAuction"];
  roomId: string;
};

export type MarkSoldEvent = {
  type: (typeof ROOM_EVENT_TYPES)["markSold"];
  roomId: string;
};

export type MarkUnsoldEvent = {
  type: (typeof ROOM_EVENT_TYPES)["markUnsold"];
  roomId: string;
};

export type PauseAuctionEvent = {
  type: (typeof ROOM_EVENT_TYPES)["pauseAuction"];
  roomId: string;
};

export type ResumeAuctionEvent = {
  type: (typeof ROOM_EVENT_TYPES)["resumeAuction"];
  roomId: string;
};

export type CloseCurrentLotEvent = {
  type: (typeof ROOM_EVENT_TYPES)["closeCurrentLot"];
  roomId: string;
};

export type ClientToServerEvent =
  | JoinRoomEvent
  | PlaceBidEvent
  | StartAuctionEvent
  | MarkSoldEvent
  | MarkUnsoldEvent
  | PauseAuctionEvent
  | ResumeAuctionEvent
  | CloseCurrentLotEvent;

export type RoomSnapshotEvent = {
  type: (typeof ROOM_EVENT_TYPES)["roomSnapshot"];
  snapshot: AuctionRoomSnapshot;
};

export type BidAcceptedEvent = {
  type: (typeof ROOM_EVENT_TYPES)["bidAccepted"];
  roomId: string;
  playerId: string;
  bidderTeamId: string;
  amountLakhs: number;
  notice: string;
};

export type TimerUpdatedEvent = {
  type: (typeof ROOM_EVENT_TYPES)["timerUpdated"];
  roomId: string;
  countdownRemainingSeconds: number;
};

export type LotStartedEvent = {
  type: (typeof ROOM_EVENT_TYPES)["lotStarted"];
  roomId: string;
  playerId: string;
  amountLakhs: number;
  notice: string;
};

export type PlayerSoldEvent = {
  type: (typeof ROOM_EVENT_TYPES)["playerSold"];
  roomId: string;
  playerId: string;
  teamId: string;
  amountLakhs: number;
  notice: string;
};

export type PlayerUnsoldEvent = {
  type: (typeof ROOM_EVENT_TYPES)["playerUnsold"];
  roomId: string;
  playerId: string;
  amountLakhs: number;
  notice: string;
};

export type AuctionPausedEvent = {
  type: (typeof ROOM_EVENT_TYPES)["auctionPaused"];
  roomId: string;
  countdownRemainingSeconds: number;
  notice: string;
};

export type AuctionResumedEvent = {
  type: (typeof ROOM_EVENT_TYPES)["auctionResumed"];
  roomId: string;
  countdownRemainingSeconds: number;
  notice: string;
};

export type RoomErrorEvent = {
  type: (typeof ROOM_EVENT_TYPES)["roomError"];
  roomId: string | null;
  code: string;
  message: string;
};

export type ServerToClientEvent =
  | RoomSnapshotEvent
  | BidAcceptedEvent
  | TimerUpdatedEvent
  | LotStartedEvent
  | PlayerSoldEvent
  | PlayerUnsoldEvent
  | AuctionPausedEvent
  | AuctionResumedEvent
  | RoomErrorEvent;
