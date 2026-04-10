"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Gavel, PauseCircle, PlayCircle, ShieldCheck, Trophy } from "lucide-react";

import { Timer } from "@/components/auction/timer";
import { Button } from "@/components/ui/button";
import type { RoomConnectionState } from "@/hooks/use-auction-room";
import { formatLakhs } from "@/lib/auction";
import type { RoomParticipantRole } from "@auction/shared";
import type { AuctionRoomPhase, AuctionRoomTeamSnapshot } from "@/types/auction";

type BidPanelProps = {
  currentBidLakhs: number;
  highestBidder: AuctionRoomTeamSnapshot | null;
  selectedTeam: AuctionRoomTeamSnapshot | null;
  timerSeconds: number;
  countdownSeconds: number;
  bidIncrementLakhs: number;
  status: AuctionRoomPhase;
  roomStatus: "draft" | "live" | "paused" | "complete";
  notice: string | null;
  hasNextPlayer: boolean;
  connectionState: RoomConnectionState;
  isHostView: boolean;
  canBid: boolean;
  roomRole: RoomParticipantRole;
  onPlaceBid: () => void;
  onMarkSold: () => void;
  onMarkUnsold: () => void;
  onPauseAuction: () => void;
  onResumeAuction: () => void;
  onCloseCurrentLot: () => void;
};

export function BidPanel({
  currentBidLakhs,
  highestBidder,
  selectedTeam,
  timerSeconds,
  countdownSeconds,
  bidIncrementLakhs,
  status,
  roomStatus,
  notice,
  hasNextPlayer,
  connectionState,
  isHostView,
  canBid,
  roomRole,
  onPlaceBid,
  onMarkSold,
  onMarkUnsold,
  onPauseAuction,
  onResumeAuction,
  onCloseCurrentLot,
}: BidPanelProps) {
  const isConnected = connectionState === "connected";
  const isLotActive = status === "live" || status === "paused";
  const isDraft = roomStatus === "draft";
  const showBidButton = status === "live" && canBid;

  return (
    <div className="scrollbar-none flex h-full min-h-0 flex-col gap-2 overflow-y-auto rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))] p-2.5">
      <div className="grid shrink-0 min-w-0 gap-2 overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.04] p-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/48">
            Current bid
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={`${status}-${currentBidLakhs}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mt-1 truncate font-display text-[clamp(1.8rem,3vw,3.2rem)] uppercase leading-none text-white"
            >
              {formatLakhs(currentBidLakhs)}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex h-9 w-9 shrink-0 self-center items-center justify-center rounded-full border border-white/10 bg-black/20">
          <Gavel className="h-3.5 w-3.5 text-white" />
        </div>
      </div>

      <div className="grid shrink-0 gap-2 sm:grid-cols-2">
        <div className="min-w-0 overflow-hidden rounded-[16px] border border-white/8 bg-black/20 p-2">
          <p className="text-[9px] uppercase tracking-[0.24em] text-white/46">Highest bidder</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-xl uppercase leading-none text-white">
                {highestBidder ? highestBidder.shortCode : "OPEN"}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[color:var(--muted-foreground)]">
                {highestBidder ? highestBidder.name : "No valid bids yet"}
              </p>
            </div>
            {highestBidder ? <Trophy className="h-3.5 w-3.5 shrink-0 text-white" /> : null}
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-[16px] border border-white/8 bg-black/20 p-2">
          <p className="text-[9px] uppercase tracking-[0.24em] text-white/46">
            {canBid ? "Assigned franchise" : "Room role"}
          </p>
          <p className="mt-1 truncate font-display text-xl uppercase leading-none text-white">
            {canBid ? (selectedTeam ? selectedTeam.shortCode : "NONE") : roomRole.toUpperCase()}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[color:var(--muted-foreground)]">
            {!canBid
              ? "View-only access."
              : status === "live"
                ? `Bid step ${formatLakhs(bidIncrementLakhs)}.`
                : status === "paused"
                  ? "Waiting for host resume."
                  : "Next lot auto-loads."}
          </p>
        </div>
      </div>

      <div className="shrink-0">
        {!isDraft ? (
          <Timer seconds={timerSeconds} duration={countdownSeconds} status={status} />
        ) : (
          <div className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2.5 text-xs text-white/72">
            {isHostView
              ? "The host can begin the auction as soon as the room is ready."
              : "Waiting for the host to start the auction."}
          </div>
        )}
      </div>

      <div className="grid content-start gap-1.5">
        {showBidButton ? (
          <Button
            type="button"
            onClick={onPlaceBid}
            size="lg"
            disabled={!isConnected}
            className="w-full justify-center"
          >
            {isConnected ? "Place bid" : "Reconnecting..."}
          </Button>
        ) : null}

        {!isDraft && isHostView ? (
          <div className="rounded-[16px] border border-white/8 bg-white/[0.04] p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/48">
                  Host controls
                </p>
                <p className="text-[11px] text-[color:var(--muted-foreground)]">
                  Pause or settle the live lot.
                </p>
              </div>
            </div>

            <div className="mt-2 grid gap-1.5 grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                onClick={status === "paused" ? onResumeAuction : onPauseAuction}
                disabled={!isConnected || !isLotActive}
                className="h-8 justify-center px-3 text-xs"
              >
                {status === "paused" ? (
                  <>
                    Resume
                    <PlayCircle className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Pause
                    <PauseCircle className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={onCloseCurrentLot}
                disabled={!isConnected || !isLotActive}
                className="h-8 justify-center px-3 text-xs"
              >
                Close lot
              </Button>

              <Button
                type="button"
                onClick={onMarkSold}
                disabled={!isConnected || !isLotActive || !highestBidder}
                className="h-8 justify-center px-3 text-xs"
              >
                Mark sold
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={onMarkUnsold}
                disabled={!isConnected || !isLotActive}
                className="h-8 justify-center border border-white/10 px-3 text-xs"
              >
                Mark unsold
              </Button>
            </div>
          </div>
        ) : null}

        {!isLotActive && hasNextPlayer && !isDraft ? (
          <div className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2 text-xs text-white/72">
            This lot is closed. The next player will be activated automatically.
          </div>
        ) : null}
      </div>

      {notice ? (
        <div className="shrink-0 rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2.5 text-xs text-white/80">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
