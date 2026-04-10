import { ArrowUpRight, Radio, ShieldCheck, Users2 } from "lucide-react";

import { CTAButton } from "@/components/cta-button";
import { FeatureCard } from "@/components/feature-card";
import { HeroSection } from "@/components/hero-section";
import { PageContainer } from "@/components/page-container";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { lobbyStats, platformFeatures, roomHighlights } from "@/data/site";

export default function HomePage() {
  return (
    <>
      <HeroSection />

      <section className="pb-14 sm:pb-16">
        <PageContainer>
          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr] xl:items-end">
            <SectionHeader
              eyebrow="Core product"
              title="Built around the room, not around filler"
              description="The application centers on private room access, live bidding, host-controlled lot flow, and a multiplayer board that stays readable under pressure."
            />

            <Card className="border-white/12 bg-[linear-gradient(180deg,rgba(22,22,24,0.96),rgba(8,8,10,0.98))]">
              <CardContent className="grid gap-4 p-6 sm:grid-cols-3 sm:p-7">
                {lobbyStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-5"
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
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {platformFeatures.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="pb-14 sm:pb-16">
        <PageContainer>
          <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
            <Card className="border-white/12 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))]">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/46">
                      Auction room layout
                    </p>
                    <h2 className="mt-4 font-display text-5xl uppercase leading-[0.9] text-white sm:text-6xl">
                      Critical bidding data stays visible first.
                    </h2>
                  </div>
                  <ArrowUpRight className="mt-1 h-5 w-5 text-white/55" />
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {["Player card", "Bid panel", "Team purse board"].map((item) => (
                        <div
                          key={item}
                          className="flex min-h-[112px] items-center justify-center rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-center"
                        >
                          <p className="max-w-[11ch] text-balance font-display text-[1.6rem] uppercase leading-[0.94] text-white sm:text-[1.82rem]">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>

                    <p className="mt-5 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
                      The auction room is optimized for desktop scanning first, with current
                      player, current bid, timer, highest bidder, and team purse movement all
                      visible before the fold.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {roomHighlights.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-5"
                      >
                        <p className="text-[11px] uppercase tracking-[0.3em] text-white/42">
                          {item.title}
                        </p>
                        <p className="mt-3 font-display text-4xl uppercase leading-none text-white">
                          {item.value}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5">
              {[
                {
                  icon: ShieldCheck,
                  title: "Host-controlled pacing",
                  description:
                    "Only the host can start, pause, or settle lots, while the rest of the room stays synchronized.",
                },
                {
                  icon: Users2,
                  title: "Role-aware room access",
                  description:
                    "Participants, viewers, and hosts each enter the room with backend-enforced permissions and a stable identity.",
                },
                {
                  icon: Radio,
                  title: "Realtime state recovery",
                  description:
                    "Room snapshots, bids, purse updates, and completed outcomes rebuild correctly after refresh or reconnect.",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <Card
                    key={item.title}
                    className="border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.96),rgba(8,8,10,0.98))]"
                  >
                    <CardContent className="flex h-full items-start gap-4 p-6 sm:p-7">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04]">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-display text-3xl uppercase leading-[0.96] text-white">
                          {item.title}
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
                          {item.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="pb-14 sm:pb-16">
        <PageContainer>
          <Card className="border-white/12 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(8,8,10,0.98))]">
            <CardContent className="flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/46">
                  Ready to run
                </p>
                <h2 className="mt-5 font-display text-5xl uppercase leading-[0.9] text-white sm:text-6xl">
                  Create a private room and start the auction when the table is ready.
                </h2>
                <p className="mt-5 text-base leading-7 text-[color:var(--muted-foreground)] sm:text-lg">
                  The room stays in lobby mode until the host begins the session, then players
                  arrive from the database in randomized room order.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <CTAButton href="/create-room">Create room</CTAButton>
                <CTAButton href="/join-room" variant="secondary">
                  Join room
                </CTAButton>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </section>
    </>
  );
}
