"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { AuctionRoomPhase } from "@/types/auction";

type TimerProps = {
  seconds: number;
  duration: number;
  status: AuctionRoomPhase;
};

function getStatusLabel(status: AuctionRoomPhase) {
  switch (status) {
    case "live":
      return "Live";
    case "paused":
      return "Paused";
    case "sold":
      return "Sold";
    case "unsold":
      return "Unsold";
    case "complete":
      return "Complete";
    default:
      return "Standby";
  }
}

export function Timer({ seconds, duration, status }: TimerProps) {
  const progress = `${Math.max((seconds / Math.max(duration, 1)) * 100, 0)}%`;
  const urgent = seconds <= 5 && status === "live";
  const isActive = status === "live" || status === "paused";

  return (
    <div className="overflow-hidden rounded-[16px] border border-white/8 bg-white/[0.04] p-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/52">
          Auction timer
        </p>
        <div
          className={`rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] ${
            urgent
              ? "bg-white/12 text-white"
              : status === "paused"
                ? "bg-white/10 text-white/78"
                : "bg-white/8 text-white/74"
          }`}
        >
          {getStatusLabel(status)}
        </div>
      </div>

      <div className="mt-1.5 flex items-end gap-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${status}-${seconds}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="truncate font-display text-[2.2rem] uppercase leading-none text-white"
          >
            {isActive ? seconds : 0}
          </motion.div>
        </AnimatePresence>
        <p className="mb-0.5 truncate text-[11px] leading-4 text-[color:var(--muted-foreground)]">
          {status === "live"
            ? "Timer resets on every valid bid."
            : status === "paused"
              ? "Host paused the room."
              : status === "idle"
                ? "Waiting for next player."
                : "Lot closed."}
        </p>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
        <motion.div
          animate={{
            width: isActive ? progress : "100%",
            backgroundColor:
              status === "paused"
                ? "rgba(212,212,216,0.78)"
                : urgent
                  ? "rgba(255,255,255,1)"
                  : "rgba(244,244,245,0.9)",
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="h-full rounded-full"
        />
      </div>
    </div>
  );
}
