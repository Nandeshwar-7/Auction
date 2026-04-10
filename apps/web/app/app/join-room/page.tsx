import { RoomAccessPanel } from "@/components/room-access-panel";
import { PageContainer } from "@/components/page-container";
import { SectionHeader } from "@/components/section-header";
import { joinRoomChecklist } from "@/data/site";

type JoinRoomPageProps = {
  searchParams?: Promise<{
    code?: string;
  }>;
};

export default async function JoinRoomPage({ searchParams }: JoinRoomPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <PageContainer className="py-14 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeader
          eyebrow="Owner flow"
          title="Join room"
          description="Enter a persisted room code and connect to its shared live auction state. The room metadata is now validated before you enter."
        />

        <RoomAccessPanel
          mode="join"
          checklist={joinRoomChecklist}
          initialRoomCode={resolvedSearchParams?.code}
        />
      </div>
    </PageContainer>
  );
}
