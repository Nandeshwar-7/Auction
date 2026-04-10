"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, UserCircle2, X } from "lucide-react";
import { useState } from "react";

import { navItems } from "@/data/site";
import { cn } from "@/lib/utils";
import { CTAButton } from "@/components/cta-button";
import { PageContainer } from "@/components/page-container";
import { useAuthSession } from "@/hooks/use-auth-session";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { user, state, signOut } = useAuthSession();

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[rgba(6,12,22,0.74)] backdrop-blur-2xl">
      <PageContainer>
        <div className="flex h-20 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(215,180,106,0.22),rgba(125,212,199,0.16))] text-lg font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              IA
            </div>
            <div>
              <p className="font-display text-2xl uppercase leading-none text-white">
                IPL Auction
              </p>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                Private room network
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium text-white/72 transition-colors hover:text-white",
                    active && "bg-white/8 text-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {state === "authenticated" && user ? (
              <>
                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-white">
                  <UserCircle2 className="h-5 w-5 text-[color:var(--accent)]" />
                  <div className="leading-tight">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                      Signed in
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm text-white/60 transition-colors hover:text-white"
                  onClick={async () => {
                    await signOut();
                    router.push("/");
                    router.refresh();
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <CTAButton href={`/login?next=${encodeURIComponent(pathname ?? "/")}`} variant="secondary">
                Sign in
              </CTAButton>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </PageContainer>

      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="border-t border-white/8 bg-[rgba(6,12,22,0.94)] md:hidden"
        >
          <PageContainer className="flex flex-col gap-2 py-4">
            {navItems.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm font-medium text-white/72 transition-colors hover:bg-white/6 hover:text-white",
                    active && "bg-white/8 text-white",
                  )}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}

            {state === "authenticated" && user ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-white">
                <p className="font-medium">{user.name}</p>
                <button
                  type="button"
                  className="mt-3 text-sm text-white/60 transition-colors hover:text-white"
                  onClick={async () => {
                    await signOut();
                    setOpen(false);
                    router.push("/");
                    router.refresh();
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="pt-2">
                <CTAButton href={`/login?next=${encodeURIComponent(pathname ?? "/")}`} variant="secondary" className="w-full">
                  Sign in
                </CTAButton>
              </div>
            )}
          </PageContainer>
        </motion.div>
      ) : null}
    </header>
  );
}
