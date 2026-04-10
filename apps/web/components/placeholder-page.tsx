import { CTAButton } from "@/components/cta-button";
import { PageContainer } from "@/components/page-container";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent } from "@/components/ui/card";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  checklist: string[];
  primaryAction: {
    href: string;
    label: string;
  };
  secondaryAction: {
    href: string;
    label: string;
  };
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  checklist,
  primaryAction,
  secondaryAction,
}: PlaceholderPageProps) {
  return (
    <PageContainer className="py-14 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeader eyebrow={eyebrow} title={title} description={description} />

        <Card className="bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(2,6,23,0.94))]">
          <CardContent className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--accent)]">
              Mock flow preview
            </p>
            <div className="mt-6 space-y-4">
              {checklist.map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/6 px-4 py-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--accent)]/14 font-display text-lg text-[color:var(--accent)]">
                    {index + 1}
                  </div>
                  <p className="text-sm text-white/82">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CTAButton href={primaryAction.href}>{primaryAction.label}</CTAButton>
              <CTAButton href={secondaryAction.href} variant="secondary">
                {secondaryAction.label}
              </CTAButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
