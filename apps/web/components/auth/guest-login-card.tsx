"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthSession } from "@/hooks/use-auth-session";

type GuestLoginCardProps = {
  nextHref?: string;
  title?: string;
  description?: string;
  compact?: boolean;
};

export function GuestLoginCard({
  nextHref,
  title = "Sign in to continue",
  description = "Create a persistent guest identity so rooms, permissions, and reconnects stay tied to the same user.",
  compact = false,
}: GuestLoginCardProps) {
  const router = useRouter();
  const { signInGuest } = useAuthSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setErrorMessage(null);

    try {
      await signInGuest({
        name,
        email: email || undefined,
      });

      if (nextHref) {
        router.push(nextHref);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.96))]">
      <CardContent className={compact ? "p-5" : "p-6 sm:p-8"}>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--accent)]">
          Session access
        </p>
        <h2 className="mt-4 font-display text-4xl uppercase leading-none text-white">
          {title}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted-foreground)]">
          {description}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5">
            <label
              htmlFor="guest-name"
              className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/58"
            >
              Display name
            </label>
            <input
              id="guest-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Auction Commissioner"
              className="mt-3 h-[3.25rem] w-full rounded-full border border-white/10 bg-black/20 px-5 text-base text-white outline-none transition-colors placeholder:text-white/32 focus:border-[color:var(--accent)]/40"
            />

            <label
              htmlFor="guest-email"
              className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.3em] text-white/58"
            >
              Email (optional)
            </label>
            <input
              id="guest-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="owner@franchise.com"
              className="mt-3 h-[3.25rem] w-full rounded-full border border-white/10 bg-black/20 px-5 text-base text-white outline-none transition-colors placeholder:text-white/32 focus:border-[color:var(--accent)]/40"
            />
          </div>

          {errorMessage ? (
            <div className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </div>
          ) : null}

          <Button type="submit" size="lg" disabled={!name.trim() || pending} className="justify-center">
            {pending ? "Signing in..." : "Continue as guest"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
