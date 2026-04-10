import { BidPanel } from "@/components/auction/bid-panel";
import { PlayerCard } from "@/components/auction/player-card";
import type { AuctionRoomBoardProps } from "@/components/auction/room-layout-types";
import { TeamList } from "@/components/auction/team-list";
import { formatLakhs } from "@/lib/auction";

function getClosedLotCopy(
  phase: AuctionRoomBoardProps["snapshot"]["phase"],
  hasNextPlayer: boolean,
  currentBidLakhs: number,
  highestBidderName: string | null,
) {
  if (phase === "sold") {
    return {
      eyebrow: "Lot settled",
      title: "Sold",
      body: highestBidderName
        ? `${highestBidderName} closed this lot at ${formatLakhs(currentBidLakhs)}.`
        : `This lot closed at ${formatLakhs(currentBidLakhs)}.`,
      meta: hasNextPlayer ? "The next player will load automatically." : "No more pending lots remain.",
    };
  }

  if (phase === "unsold") {
    return {
      eyebrow: "Lot settled",
      title: "Unsold",
      body: "No valid bid survived the timer, so the player returns to the pool unsold.",
      meta: hasNextPlayer ? "The next player will load automatically." : "No more pending lots remain.",
    };
  }

  return {
    eyebrow: "Auction complete",
    title: "Room complete",
    body: "All persisted lots in this room have been settled.",
    meta: "You can keep reviewing the board while the final room state stays in sync.",
  };
}

export function ClosedLotRoomLayout({
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
  const closedCopy = getClosedLotCopy(
    snapshot.phase,
    snapshot.hasNextPlayer,
    snapshot.currentBidLakhs,
    highestBidder?.name ?? null,
  );

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

      <div className="grid gap-2.5 xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)]">
        <section className="grid min-w-0 gap-3 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))] p-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/48">
              {closedCopy.eyebrow}
            </p>
            <h2 className="mt-2 truncate font-display text-3xl uppercase leading-none text-white sm:text-4xl">
              {closedCopy.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
              {closedCopy.body}
            </p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3 text-xs text-white/72">
            {closedCopy.meta}
          </div>
        </section>

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
