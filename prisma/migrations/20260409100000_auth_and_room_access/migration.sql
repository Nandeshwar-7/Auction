CREATE TYPE "RoomPrivacy" AS ENUM ('PRIVATE', 'PUBLIC');
CREATE TYPE "RoomParticipantRole" AS ENUM ('HOST', 'PARTICIPANT', 'VIEWER');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Room"
ADD COLUMN "privacy" "RoomPrivacy" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN "hostUserId" TEXT;

ALTER TABLE "RoomParticipant"
ADD COLUMN "userId" TEXT,
ADD COLUMN "role" "RoomParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
ADD COLUMN "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

INSERT INTO "User" ("id", "name", "avatarUrl", "createdAt")
SELECT
    'legacy-user-' || "RoomParticipant"."id",
    COALESCE(NULLIF("RoomParticipant"."displayName", ''), 'Legacy User'),
    NULL,
    "RoomParticipant"."createdAt"
FROM "RoomParticipant";

UPDATE "RoomParticipant"
SET
    "userId" = 'legacy-user-' || "RoomParticipant"."id",
    "role" = CASE WHEN "RoomParticipant"."isHost" THEN 'HOST'::"RoomParticipantRole" ELSE 'PARTICIPANT'::"RoomParticipantRole" END,
    "joinedAt" = "RoomParticipant"."createdAt";

UPDATE "Room"
SET "hostUserId" = "HostParticipants"."userId"
FROM (
    SELECT DISTINCT ON ("roomId") "roomId", "userId"
    FROM "RoomParticipant"
    WHERE "isHost" = true
    ORDER BY "roomId", "createdAt"
) AS "HostParticipants"
WHERE "Room"."id" = "HostParticipants"."roomId";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "RoomParticipant_userId_idx" ON "RoomParticipant"("userId");
CREATE INDEX "Room_hostUserId_idx" ON "Room"("hostUserId");

ALTER TABLE "Session"
ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Room"
ADD CONSTRAINT "Room_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RoomParticipant"
ADD CONSTRAINT "RoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
