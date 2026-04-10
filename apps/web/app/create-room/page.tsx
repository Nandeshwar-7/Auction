import { RoomAccessPanel } from "@/components/room-access-panel";
import { PageContainer } from "@/components/page-container";
import { SectionHeader } from "@/components/section-header";
import { createRoomChecklist } from "@/data/site";

export default function CreateRoomPage() {
  return (
    <PageContainer className="py-14 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeader
          eyebrow="Host flow"
          title="Create room"
          description="Create a persisted auction room backed by PostgreSQL, then hand it off to the live websocket engine as soon as you enter."
        />

        <RoomAccessPanel mode="create" checklist={createRoomChecklist} />
      </div>
    </PageContainer>
  );
}
