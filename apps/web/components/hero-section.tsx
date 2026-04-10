"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Crown, Radio, ShieldCheck, TimerReset, Users2 } from "lucide-react";

import { CTAButton } from "@/components/cta-button";
import { PageContainer } from "@/components/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { heroStats, marqueeBadges } from "@/data/site";

const previewRows = [
  { label: "Current player", value: "R. Sharma", detail: "Base 2.0 Cr" },
  { label: "Current bid", value: "18.5 Cr", detail: "Led by CSK" },
  { label: "Room state", value: "Live", detail: "8 members connected" },
] as const;

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden pt-6 pb-12 sm:pt-10 sm:pb-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className="absolute left-[8%] top-4 h-56 w-56 rounded-full bg-white/8 blur-3xl" />
        <div className="absolute right-[9%] top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      </div>

      <PageContainer className="relative">
        <div className="grid items-start gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:gap-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/72">
              <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
              Live IPL auction rooms
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {marqueeBadges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/58 sm:text-[11px]"
                >
                  {badge}
                </span>
              ))}
            </div>

            <h1 className="mt-7 max-w-4xl font-display text-[3.4rem] uppercase leading-[0.86] text-white sm:text-[4.6rem] lg:text-[6rem]">
              Private IPL auction rooms built for fast, live multiplayer bidding.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--muted-foreground)] sm:text-lg">
              Host the room, lock each participant to a franchise, and run the full auction
              lifecycle in a single realtime board without losing clarity.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CTAButton href="/create-room">Create private room</CTAButton>
              <CTAButton href="/join-room" variant="secondary">
                Join with room code
              </CTAButton>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                >
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/42">
                    {stat.label}
                  </p>
                  <p className="mt-3 font-display text-4xl uppercase text-white">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                    {stat.hint}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.04 }}
          >
            <Card className="border-white/12 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))]">
              <CardContent className="grid gap-5 p-0">
                <div className="border-b border-white/10 px-6 py-5 sm:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/48">
                        Auction room preview
                      </p>
                      <h2 className="mt-3 font-display text-4xl uppercase leading-none text-white">
                        Focused live board
                      </h2>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/68">
                      ROOM MKT42
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 px-6 pb-6 sm:px-7 sm:pb-7">
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.26em] text-white/70">
                          <Crown className="h-4 w-4" />
                          Host-controlled
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.28em] text-white/42">
                          Lot 08 / 18
                        </span>
                      </div>
                      <p className="mt-7 text-[11px] uppercase tracking-[0.28em] text-white/48">
                        Current player
                      </p>
                      <p className="mt-3 font-display text-6xl uppercase leading-[0.86] text-white">
                        S. Iyer
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
                        Current bid, timer, highest bidder, and purse board stay visible on the
                        first screen so the room feels immediate during live rounds.
                      </p>
                    </div>

                    <div className="grid gap-4">
                      <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
                        <div className="flex items-center gap-3">
                          <TimerReset className="h-5 w-5 text-white" />
                          <p className="text-[11px] uppercase tracking-[0.28em] text-white/54">
                            Countdown
                          </p>
                        </div>
                        <p className="mt-4 font-display text-5xl uppercase text-white">00:11</p>
                      </div>

                      <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
                        <div className="flex items-center gap-3">
                          <Radio className="h-5 w-5 text-white" />
                          <p className="text-[11px] uppercase tracking-[0.28em] text-white/54">
                            Highest bidder
                          </p>
                        </div>
                        <p className="mt-4 font-display text-4xl uppercase text-white">MI</p>
                        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                          Purse remaining 61.0 Cr
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {previewRows.map((row) => (
                      <div
                        key={row.label}
                        className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4"
                      >
                        <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">
                          {row.label}
                        </p>
                        <p className="mt-2 font-display text-3xl uppercase text-white">
                          {row.value}
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                          {row.detail}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { icon: ShieldCheck, label: "Private host room" },
                      { icon: Users2, label: "Participant roles" },
                      { icon: Radio, label: "Realtime sync" },
                    ].map((item) => {
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.label}
                          className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <p className="text-sm text-white/76">{item.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </PageContainer>
    </section>
  );
}
