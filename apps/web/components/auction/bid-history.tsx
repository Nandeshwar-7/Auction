import { formatLakhs } from "@/lib/auction";
import { cn } from "@/lib/utils";
import type { AuctionHistoryEntry } from "@/types/auction";

type BidHistoryProps = {
  entries: AuctionHistoryEntry[];
  compact?: boolean;
};

export function BidHistory({ entries, compact = false }: BidHistoryProps) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))] p-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/48">
            Live tape
          </p>
          <h3 className="mt-1 font-display text-xl uppercase leading-none text-white sm:text-2xl">
            Bid history
          </h3>
        </div>
        <p className="text-xs text-[color:var(--muted-foreground)]">Newest first</p>
      </div>

      <div className={cn("scrollbar-none mt-3 min-h-0 overflow-y-auto", compact ? "grid content-start gap-1.5" : "grid content-start gap-2")}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em]",
                      entry.type === "bid" && "bg-white/10 text-white",
                      entry.type === "sold" && "bg-white/8 text-white/84",
                      entry.type === "unsold" && "bg-white/8 text-white/84",
                      entry.type === "nomination" && "bg-white/7 text-white/76",
                    )}
                  >
                    {entry.type}
                  </span>
                  <p className="font-display text-lg uppercase leading-none text-white">{entry.playerName}</p>
                </div>
                <p className="mt-1 text-[11px] text-[color:var(--muted-foreground)]">{entry.label}</p>
              </div>

              {entry.amountLakhs ? (
                <p className="shrink-0 font-display text-xl uppercase text-white">
                  {formatLakhs(entry.amountLakhs)}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
