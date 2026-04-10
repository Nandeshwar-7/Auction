"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ChevronUp,
  Crown,
  Radio,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

import { ActiveAuctionRoomLayout } from "@/components/auction/active-auction-room-layout";
import { BidHistory } from "@/components/auction/bid-history";
import { ClosedLotRoomLayout } from "@/components/auction/closed-lot-room-layout";
import { LobbyRoomLayout } from "@/components/auction/lobby-room-layout";
import { GuestLoginCard } from "@/components/auth/guest-login-card";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuctionRoom } from "@/hooks/use-auction-room";

type AuctionRoomShellProps = {
  roomId: string;
};

function getStatusValue(
  phase: "idle" | "live" | "paused" | "sold" | "unsold" | "complete",
  roomStatus: string,
) {
  if (phase === "paused") {
    return "Paused";
  }

  if (phase === "live") {
    return "Bidding";
  }

  if (phase === "sold") {
    return "Sold";
  }

  if (phase === "unsold") {
    return "Unsold";
  }

  if (phase === "complete") {
    return "Complete";
  }

  return roomStatus === "draft" ? "Lobby" : "Waiting";
}

function RoomLoadingState({
  roomId,
  label,
  message,
  debugMessage,
  onRetry,
}: {
  roomId: string;
  label: string;
  message: string;
  debugMessage?: string | null;
  onRetry?: () => void;
}) {
  return (
    <PageContainer className="py-8 sm:py-10">
      <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))] p-8 sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/48">
          {label}
        </p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none text-white sm:text-6xl">
          {roomId}
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
          {message}
        </p>
        {debugMessage ? (
          <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/78">
            {debugMessage}
          </div>
        ) : null}
        {onRetry ? (
          <div className="mt-5">
            <Button type="button" variant="secondary" onClick={onRetry}>
              Retry connection
            </Button>
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}

export function AuctionRoomShell({ roomId }: AuctionRoomShellProps) {
  const {
    snapshot,
    access,
    accessState,
    connectionState,
    notice,
    debugMessage,
    placeBid,
    startAuction,
    markSold,
    markUnsold,
    pauseAuction,
    resumeAuction,
    closeCurrentLot,
    retryConnection,
  } = useAuctionRoom(roomId);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const footer = document.querySelector("footer") as HTMLElement | null;
    const previousFooterDisplay = footer?.style.display ?? "";

    // Only lock body scroll on desktop (xl = 1280px+) where the layout is a
    // fixed-height dashboard. On mobile/tablet the page must stay scrollable.
    const mql = window.matchMedia("(min-width: 1280px)");

    const handleViewportChange = (e: MediaQueryListEvent) => {
      document.body.style.overflow = e.matches ? "hidden" : "";
    };

    document.body.style.overflow = mql.matches ? "hidden" : "";
    mql.addEventListener("change", handleViewportChange);

    if (footer) {
      footer.style.display = "none";
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      if (footer) {
        footer.style.display = previousFooterDisplay;
      }
      mql.removeEventListener("change", handleViewportChange);
    };
  }, []);

  if (accessState === "loading") {
    return (
      <RoomLoadingState
        roomId={roomId}
        label="Room access"
        message="Validating your session and room permissions."
      />
    );
  }

  if (accessState === "unauthenticated") {
    return (
      <PageContainer className="py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))] p-8 sm:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/48">
              Room access
            </p>
            <h1 className="mt-4 font-display text-5xl uppercase leading-none text-white sm:text-6xl">
              {roomId}
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
              This room is access-controlled. Sign in with your persistent guest session
              so your identity, membership, and room role can be restored.
            </p>
          </div>
          <GuestLoginCard nextHref={`/room/${encodeURIComponent(roomId)}`} compact />
        </div>
      </PageContainer>
    );
  }

  if (accessState === "unauthorized" || !access) {
    return (
      <PageContainer className="py-8 sm:py-10">
        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))] p-8 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/48">
            Access denied
          </p>
          <h1 className="mt-4 font-display text-5xl uppercase leading-none text-white sm:text-6xl">
            {roomId}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--muted-foreground)]">
            {notice ??
              "You are not a member of this private room. Join with a valid room code or ask the host for access."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild type="button" size="lg">
              <Link href={`/join-room?code=${encodeURIComponent(roomId)}`}>Join room</Link>
            </Button>
            <Button asChild type="button" variant="secondary" size="lg">
              <Link href="/">Back home</Link>
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!snapshot) {
    return (
      <RoomLoadingState
        roomId={roomId}
        label="Live auction room"
        message={
          connectionState === "connecting" || connectionState === "idle"
            ? "Connecting to the realtime auction server."
            : "Waiting for the latest room snapshot."
        }
        debugMessage={debugMessage}
        onRetry={retryConnection}
      />
    );
  }

  const selectedTeam =
    snapshot.teams.find((team) => team.id === access.assignedTeamId) ?? null;
  const highestBidder =
    snapshot.teams.find((team) => team.id === snapshot.highestBidderId) ?? null;
  const isLobby = snapshot.roomStatus === "draft";
  const isClosedLotState =
    !isLobby &&
    (snapshot.phase === "sold" ||
      snapshot.phase === "unsold" ||
      snapshot.phase === "complete");

  const topMetrics = [
    {
      icon: Users,
      label: "Joined",
      value: String(snapshot.memberCount),
    },
    {
      icon: Activity,
      label: "Lot",
      value: `${snapshot.lotNumber}/${snapshot.totalLots}`,
    },
    {
      icon: Crown,
      label: "Leader",
      value: highestBidder ? highestBidder.shortCode : "OPEN",
    },
    {
      icon: Radio,
      label: "Status",
      value: getStatusValue(snapshot.phase, snapshot.roomStatus),
    },
    {
      icon: connectionState === "connected" ? Wifi : WifiOff,
      label: "Sync",
      value:
        connectionState === "connected"
          ? "Live"
          : connectionState === "reconnecting"
            ? "Retrying"
            : "Connecting",
    },
  ];

  const headerChips = [
    `Code ${snapshot.roomId}`,
    `Privacy ${access.room.privacy}`,
    `Role ${access.role}`,
    access.assignedTeamId && selectedTeam ? `Franchise ${selectedTeam.shortCode}` : null,
    access.role === "host" && access.inviteCode ? `Invite ${access.inviteCode}` : null,
  ].filter(Boolean) as string[];

  const boardProps = {
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
  };

  const mainBoard = isLobby ? (
    <LobbyRoomLayout {...boardProps} />
  ) : isClosedLotState ? (
    <ClosedLotRoomLayout {...boardProps} />
  ) : (
    <ActiveAuctionRoomLayout {...boardProps} />
  );

  return (
    <PageContainer className="py-3 xl:h-[calc(100dvh-6.25rem)] xl:overflow-hidden">
      <div className="grid gap-2.5 xl:h-full xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)_auto]">
        <section className="grid gap-2 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))] p-2.5">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-white/48">
                Live auction room
              </p>
              <h1 className="mt-1.5 truncate font-display text-xl uppercase leading-none text-white sm:text-3xl xl:text-[2rem]">
                {snapshot.roomName}
              </h1>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {headerChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-white/66"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {topMetrics.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="min-w-0 rounded-[16px] border border-white/10 bg-white/[0.04] px-2 py-1.5"
                  >
                    <div className="flex items-center gap-1">
                      <Icon className="h-3 w-3 shrink-0 text-white/78" />
                      <p className="truncate text-[9px] uppercase tracking-[0.2em] text-white/44">
                        {item.label}
                      </p>
                    </div>
                    <p className="mt-1 truncate font-display text-base uppercase leading-none text-white sm:text-xl">
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {connectionState !== "connected" ? (
            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/76">
              <p>
                {connectionState === "reconnecting"
                  ? "Realtime sync is reconnecting. The room will refresh automatically when the server is back."
                  : "Joining the room and waiting for the current auction snapshot."}
              </p>
              {debugMessage ? <p className="mt-2 text-white/56">{debugMessage}</p> : null}
            </div>
          ) : null}
        </section>

        <div className="xl:min-h-0">{mainBoard}</div>

        {isLobby ? null : (
          <section
            className={cn(
              "grid gap-2 xl:min-h-0",
              historyOpen ? "grid-rows-[auto_minmax(0,18rem)]" : "grid-rows-[auto]",
            )}
          >
            <button
              type="button"
              onClick={() => setHistoryOpen((value) => !value)}
              className="grid w-full grid-cols-[1fr_auto] items-center rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))] px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/44">Live tape</p>
                <p className="mt-1 truncate text-sm text-white/72">
                  {snapshot.bidHistory.length} room events. Expand to inspect the latest tape.
                </p>
              </div>
              <ChevronUp
                className={cn(
                  "h-4 w-4 shrink-0 text-white/70 transition-transform",
                  historyOpen ? "rotate-0" : "rotate-180",
                )}
              />
            </button>

            {historyOpen ? (
              <div className="xl:min-h-0 xl:overflow-hidden">
                <BidHistory entries={snapshot.bidHistory.slice(0, 5)} compact />
              </div>
            ) : null}
          </section>
        )}
      </div>
    </PageContainer>
  );
}
