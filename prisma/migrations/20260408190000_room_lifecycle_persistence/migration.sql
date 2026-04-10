ALTER TABLE "Room"
ADD COLUMN "hostToken" TEXT,
ADD COLUMN "currentLotId" TEXT,
ADD COLUMN "isPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "timerEndsAt" TIMESTAMP(3),
ADD COLUMN "pausedRemainingSeconds" INTEGER;

UPDATE "Room"
SET "hostToken" = md5("id" || "code" || clock_timestamp()::text)
WHERE "hostToken" IS NULL;

ALTER TABLE "Room"
ALTER COLUMN "hostToken" SET NOT NULL;

ALTER TABLE "AuctionLot"
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "closedAt" TIMESTAMP(3);

UPDATE "AuctionLot"
SET "startedAt" = "createdAt"
WHERE "status" = 'LIVE' AND "startedAt" IS NULL;

UPDATE "AuctionLot"
SET "closedAt" = "updatedAt"
WHERE "status" IN ('SOLD', 'UNSOLD') AND "closedAt" IS NULL;

CREATE TABLE "RoomTeam" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "purseRemaining" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomTeam_pkey" PRIMARY KEY ("id")
);

INSERT INTO "RoomTeam" ("id", "roomId", "teamId", "purseRemaining", "createdAt", "updatedAt")
SELECT
    md5("Room"."id" || ':' || "Team"."id"),
    "Room"."id",
    "Team"."id",
    "Team"."purse",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Room"
CROSS JOIN "Team";

UPDATE "Room"
SET "currentLotId" = "LiveLots"."id"
FROM (
    SELECT DISTINCT ON ("roomId") "roomId", "id"
    FROM "AuctionLot"
    WHERE "status" = 'LIVE'
    ORDER BY "roomId", "order"
) AS "LiveLots"
WHERE "Room"."id" = "LiveLots"."roomId";

CREATE UNIQUE INDEX "Room_hostToken_key" ON "Room"("hostToken");
CREATE INDEX "Room_currentLotId_idx" ON "Room"("currentLotId");
CREATE UNIQUE INDEX "RoomTeam_roomId_teamId_key" ON "RoomTeam"("roomId", "teamId");
CREATE INDEX "RoomTeam_roomId_idx" ON "RoomTeam"("roomId");
CREATE INDEX "RoomTeam_teamId_idx" ON "RoomTeam"("teamId");

ALTER TABLE "Room"
ADD CONSTRAINT "Room_currentLotId_fkey" FOREIGN KEY ("currentLotId") REFERENCES "AuctionLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RoomTeam"
ADD CONSTRAINT "RoomTeam_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomTeam"
ADD CONSTRAINT "RoomTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
