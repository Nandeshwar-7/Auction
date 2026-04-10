import type { RoomConnectionState } from "@/hooks/use-auction-room";
import type { RoomAccessRecord } from "@auction/shared";
import type { AuctionRoomSnapshot, AuctionRoomTeamSnapshot } from "@/types/auction";

export type AuctionRoomBoardProps = {
  snapshot: AuctionRoomSnapshot;
  access: RoomAccessRecord;
  highestBidder: AuctionRoomTeamSnapshot | null;
  selectedTeam: AuctionRoomTeamSnapshot | null;
  connectionState: RoomConnectionState;
  notice: string | null;
  placeBid: () => void;
  startAuction: () => void;
  markSold: () => void;
  markUnsold: () => void;
  pauseAuction: () => void;
  resumeAuction: () => void;
  closeCurrentLot: () => void;
};
