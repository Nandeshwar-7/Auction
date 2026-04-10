import Link from "next/link";

import { footerLinks } from "@/data/site";
import { PageContainer } from "@/components/page-container";

export function Footer() {
  return (
    <footer className="border-t border-white/8 py-10 sm:py-12">
      <PageContainer className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="font-display text-3xl uppercase text-white">IPL Auction</p>
          <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
            Frontend-first shell for a premium fantasy auction experience, ready to grow
            into rooms, realtime bidding, dashboards, and franchise management.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/72 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </PageContainer>
    </footer>
  );
}
