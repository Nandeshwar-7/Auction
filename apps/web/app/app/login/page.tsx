import { GuestLoginCard } from "@/components/auth/guest-login-card";
import { PageContainer } from "@/components/page-container";
import { SectionHeader } from "@/components/section-header";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextHref = resolvedSearchParams?.next;

  return (
    <PageContainer className="py-14 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeader
          eyebrow="Identity"
          title="Sign in"
          description="Use a persistent guest session to create private rooms, join with your own identity, and reconnect with the right role every time."
        />

        <GuestLoginCard nextHref={nextHref} />
      </div>
    </PageContainer>
  );
}
