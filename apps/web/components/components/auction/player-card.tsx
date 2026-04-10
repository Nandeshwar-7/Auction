import Image from "next/image";

import { formatLakhs, getPlayerInitials } from "@/lib/auction";
import type {
  AuctionPlayer,
  AuctionRoomPhase,
  AuctionRoomTeamSnapshot,
  AuctionSaleOutcome,
} from "@/types/auction";

type PlayerCardProps = {
  player: AuctionPlayer | null;
  leadingTeam: AuctionRoomTeamSnapshot | null;
  status: AuctionRoomPhase;
  saleOutcome: AuctionSaleOutcome;
};

function buildEmptyStateCopy(status: AuctionRoomPhase) {
  if (status === "complete") {
    return {
      title: "Auction complete",
      body: "Every persisted lot in this room has been settled.",
    };
  }

  return {
    title: "Lobby on standby",
    body: "The first lot will appear here once the host starts the session.",
  };
}

export function PlayerCard({ player, leadingTeam, status, saleOutcome }: PlayerCardProps) {
  if (!player) {
    const emptyState = buildEmptyStateCopy(status);

    return (
      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))] p-4 xl:h-full xl:min-h-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/48">
          Current player
        </p>
        <h2 className="mt-2 font-display text-3xl uppercase text-white sm:text-4xl">
          {emptyState.title}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[color:var(--muted-foreground)]">
          {emptyState.body}
        </p>
      </div>
    );
  }

  const stageLabel =
    status === "live"
      ? "On stage"
      : status === "paused"
        ? "Paused"
        : saleOutcome === "unsold" || status === "unsold"
          ? "Unsold"
          : status === "sold" || status === "complete"
            ? "Sold"
            : "Standby";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))] p-3">
      <div
        className="relative h-[55vw] min-h-[8rem] overflow-hidden rounded-[20px] border border-white/8 md:h-auto md:flex-1"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(255,255,255,0.12), transparent 30%), linear-gradient(135deg, rgba(36,36,40,1) 0%, rgba(10,10,12,1) 100%)",
        }}
      >
        <div className="absolute top-2.5 right-2.5 z-10 rounded-full border border-white/14 bg-black/30 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/78">
          {stageLabel}
        </div>

        <Image
          src={player.image}
          alt={player.name}
          width={640}
          height={760}
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute right-2.5 bottom-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/30 font-display text-base uppercase text-white">
          {getPlayerInitials(player.name)}
        </div>
      </div>

      <div className="shrink-0 space-y-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/48">
            Current player
          </p>
          <h2 className="mt-1.5 truncate font-display text-[clamp(1.5rem,2.1vw,2.5rem)] uppercase leading-[0.9] text-white">
            {player.name}
          </h2>
          <p className="mt-1.5 truncate text-sm text-[color:var(--muted-foreground)]">
            {[player.role, player.origin].join(" | ")}
          </p>
        </div>

        <div className="grid gap-2 grid-cols-2">
          <div className="min-w-0 overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.04] p-2.5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/46">Base price</p>
            <p className="mt-1 truncate font-display text-2xl uppercase leading-none text-white">
              {formatLakhs(player.basePriceLakhs)}
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.04] p-2.5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/46">
              Leading franchise
            </p>
            <p className="mt-1 truncate font-display text-2xl uppercase leading-none text-white">
              {leadingTeam ? leadingTeam.shortCode : "OPEN"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
