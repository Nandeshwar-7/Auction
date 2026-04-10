import { formatLakhs } from "@/lib/auction";
import { cn } from "@/lib/utils";
import type { RoomConnectionState } from "@/hooks/use-auction-room";
import type { AuctionRoomTeamSnapshot } from "@/types/auction";

type TeamListProps = {
  teams: AuctionRoomTeamSnapshot[];
  assignedTeamId: string | null;
  highestBidderId: string | null;
  currentBidLakhs: number;
  bidIncrementLakhs: number;
  connectionState: RoomConnectionState;
  canBid: boolean;
};

function getDensity(teams: AuctionRoomTeamSnapshot[]) {
  if (teams.length >= 8) {
    return {
      rowMinHeightRem: 3.75,
      avatarClassName: "h-8 w-8",
      codeClassName: "text-lg",
      purseClassName: "text-lg",
      paddingClassName: "px-3 py-2",
      badgeClassName: "px-2 py-0.5 text-[8px]",
      nameClassName: "text-[11px]",
    };
  }

  if (teams.length >= 6) {
    return {
      rowMinHeightRem: 4.1,
      avatarClassName: "h-9 w-9",
      codeClassName: "text-xl",
      purseClassName: "text-xl",
      paddingClassName: "px-3 py-2.5",
      badgeClassName: "px-2 py-0.5 text-[9px]",
      nameClassName: "text-xs",
    };
  }

  return {
    rowMinHeightRem: 4.6,
    avatarClassName: "h-10 w-10",
    codeClassName: "text-2xl",
    purseClassName: "text-2xl",
    paddingClassName: "px-3.5 py-3",
    badgeClassName: "px-2.5 py-0.5 text-[9px]",
    nameClassName: "text-xs",
  };
}

export function TeamList({
  teams,
  assignedTeamId,
  highestBidderId,
  currentBidLakhs,
  bidIncrementLakhs,
  connectionState,
  canBid,
}: TeamListProps) {
  const nextBidLakhs = highestBidderId ? currentBidLakhs + bidIncrementLakhs : currentBidLakhs;
  const isConnected = connectionState === "connected";
  const density = getDensity(teams);

  return (
    <div className="grid gap-3 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))] p-4 xl:h-full xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)]">
      <div className="flex min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/48">
            Franchises
          </p>
          <h3 className="mt-2 truncate font-display text-2xl uppercase leading-none text-white sm:text-3xl">
            Purse board
          </h3>
        </div>
        <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">
          Next {formatLakhs(nextBidLakhs)}
        </div>
      </div>

      <div
        className="scrollbar-none grid gap-2 overflow-y-auto xl:min-h-0"
        style={{
          gridTemplateRows: `repeat(${Math.max(teams.length, 1)}, minmax(${density.rowMinHeightRem}rem, 1fr))`,
        }}
      >
        {teams.map((team) => {
          const remaining = team.purseRemainingLakhs;
          const isLeading = highestBidderId === team.id;
          const isAssigned = assignedTeamId === team.id;
          const canAfford = remaining >= nextBidLakhs;

          return (
            <div
              key={team.id}
              className={cn(
                "grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-[18px] border border-white/8 transition-[border-color,background-color] duration-200",
                density.paddingClassName,
                "bg-white/[0.04] hover:border-white/14 hover:bg-white/[0.06]",
                isAssigned && "border-white/16 bg-white/[0.08]",
                isLeading &&
                  "border-white/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.02))]",
                !isConnected && "opacity-80",
              )}
            >
              <div
                className={cn("shrink-0 rounded-full border border-white/10", density.avatarClassName)}
                style={{
                  background: `linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor})`,
                }}
              />

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p
                    className={cn(
                      "min-w-0 truncate font-display uppercase leading-none text-white",
                      density.codeClassName,
                    )}
                  >
                    {team.shortCode}
                  </p>
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {isLeading ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full bg-white/10 font-semibold uppercase tracking-[0.18em] text-white",
                          density.badgeClassName,
                        )}
                      >
                        Lead
                      </span>
                    ) : null}
                    {isAssigned ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full bg-white/8 font-semibold uppercase tracking-[0.18em] text-white/78",
                          density.badgeClassName,
                        )}
                      >
                        Yours
                      </span>
                    ) : null}
                    {!canAfford ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full bg-white/10 font-semibold uppercase tracking-[0.18em] text-white",
                          density.badgeClassName,
                        )}
                      >
                        Low
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className={cn("truncate text-white/68", density.nameClassName)}>{team.name}</p>
                {!canBid && isAssigned ? (
                  <p className="truncate text-[10px] text-white/54">Assigned to you</p>
                ) : null}
              </div>

              <div className="min-w-0 text-right">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/44">Purse</p>
                <p
                  className={cn(
                    "mt-1 truncate font-display uppercase leading-none text-white",
                    density.purseClassName,
                  )}
                >
                  {formatLakhs(remaining)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
