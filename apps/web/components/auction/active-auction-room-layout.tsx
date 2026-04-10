import { BidPanel } from "@/components/auction/bid-panel";
import { PlayerCard } from "@/components/auction/player-card";
import type { AuctionRoomBoardProps } from "@/components/auction/room-layout-types";
import { TeamList } from "@/components/auction/team-list";

export function ActiveAuctionRoomLayout({
  snapshot,
  access,
  highestBidder,
  selectedTeam,
  connectionState,
  notice,
  placeBid,
  markSold,
  markUnsold,
  pauseAuction,
  resumeAuction,
  closeCurrentLot,
}: AuctionRoomBoardProps) {
  return (
    <section className="grid gap-2.5 md:grid-cols-2 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(18rem,0.88fr)_minmax(20rem,1fr)_minmax(18rem,0.92fr)]">
      <div className="overflow-hidden xl:min-h-0">
        <PlayerCard
          player={snapshot.currentPlayer}
          leadingTeam={highestBidder}
          status={snapshot.phase}
          saleOutcome={snapshot.saleOutcome}
        />
      </div>

      <div className="overflow-hidden xl:min-h-0">
        <BidPanel
          currentBidLakhs={snapshot.currentBidLakhs}
          highestBidder={highestBidder}
          selectedTeam={selectedTeam}
          timerSeconds={snapshot.countdownRemainingSeconds}
          countdownSeconds={snapshot.countdownDurationSeconds}
          bidIncrementLakhs={snapshot.bidIncrementLakhs}
          status={snapshot.phase}
          roomStatus={snapshot.roomStatus}
          notice={notice}
          hasNextPlayer={snapshot.hasNextPlayer}
          connectionState={connectionState}
          isHostView={access.canControlAuction}
          canBid={access.canBid}
          roomRole={access.role}
          onPlaceBid={placeBid}
          onMarkSold={markSold}
          onMarkUnsold={markUnsold}
          onPauseAuction={pauseAuction}
          onResumeAuction={resumeAuction}
          onCloseCurrentLot={closeCurrentLot}
        />
      </div>

      <div className="overflow-hidden md:col-span-2 xl:col-span-1 xl:min-h-0">
        <TeamList
          teams={snapshot.teams}
          assignedTeamId={access.assignedTeamId}
          highestBidderId={snapshot.highestBidderId}
          currentBidLakhs={snapshot.currentBidLakhs}
          bidIncrementLakhs={snapshot.bidIncrementLakhs}
          connectionState={connectionState}
          canBid={access.canBid}
        />
      </div>
    </section>
  );
}
