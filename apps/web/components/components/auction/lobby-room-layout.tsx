import { BidPanel } from "@/components/auction/bid-panel";
import { PlayerCard } from "@/components/auction/player-card";
import type { AuctionRoomBoardProps } from "@/components/auction/room-layout-types";
import { Button } from "@/components/ui/button";

export function LobbyRoomLayout({
  snapshot,
  access,
  highestBidder,
  selectedTeam,
  connectionState,
  notice,
  placeBid,
  startAuction,
  markSold,
  markUnsold,
  pauseAuction,
  resumeAuction,
  closeCurrentLot,
}: AuctionRoomBoardProps) {
  return (
    <section className="grid gap-2.5 lg:grid-cols-[minmax(19rem,0.92fr)_minmax(0,1.08fr)] xl:h-full xl:min-h-0">
      <div className="overflow-hidden xl:min-h-0">
        <PlayerCard
          player={snapshot.currentPlayer}
          leadingTeam={highestBidder}
          status={snapshot.phase}
          saleOutcome={snapshot.saleOutcome}
        />
      </div>

      <div className="grid gap-2.5 xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)]">
        <section className="grid min-w-0 gap-3 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,auto)] sm:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/48">
              Pre-auction lobby
            </p>
            <h2 className="mt-2 truncate font-display text-3xl uppercase leading-none text-white sm:text-4xl">
              {snapshot.memberCount} members ready
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted-foreground)]">
              Everyone stays here until the host begins the live room.
            </p>
          </div>

          <div className="grid min-w-0 gap-2 sm:min-w-[13rem]">
            {access.canControlAuction ? (
              <>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-center text-[10px] uppercase tracking-[0.26em] text-white/70">
                  Host ready
                </div>
                <Button
                  type="button"
                  size="lg"
                  disabled={connectionState !== "connected"}
                  onClick={startAuction}
                >
                  {connectionState === "connected" ? "Start auction" : "Reconnecting..."}
                </Button>
              </>
            ) : (
              <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/72">
                Waiting for the host to begin the session.
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)] xl:min-h-0">
          <section className="grid gap-3 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))] p-3 xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)]">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/48">
                  Participants
                </p>
                <h3 className="mt-2 truncate font-display text-2xl uppercase leading-none text-white">
                  Room table
                </h3>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/62">
                {snapshot.memberCount} joined
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 xl:min-h-0 2xl:grid-cols-3">
              {snapshot.members.slice(0, 6).map((member) => (
                <div
                  key={member.id}
                  className="min-w-0 overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.04] p-3"
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base uppercase text-white">
                        {member.displayName}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.22em] text-white/46">
                        {member.role}
                      </p>
                    </div>
                    {member.isHost ? (
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.07] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/80">
                        Host
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 truncate text-xs leading-5 text-[color:var(--muted-foreground)]">
                    {member.teamName
                      ? `Locked to ${member.teamName}`
                      : member.role === "viewer"
                        ? "Viewer seat"
                        : "Awaiting franchise"}
                  </p>
                </div>
              ))}
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
      </div>
    </section>
  );
}
