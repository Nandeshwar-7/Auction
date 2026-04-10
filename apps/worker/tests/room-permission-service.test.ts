import assert from "node:assert/strict";

import type { RoomAccessRecord } from "@auction/shared";
import type { AuthUser, RoomParticipantRole } from "@auction/shared";
import { canBidForRole, canControlAuctionForRole } from "@auction/shared";
import { defineTest, type TestSuite } from "./test-harness";

function createUser(): AuthUser {
  return {
    id: "user-1",
    name: "Auction User",
    email: null,
    avatarUrl: null,
    createdAt: new Date(Date.UTC(2026, 3, 9, 10, 0, 0)).toISOString(),
  };
}

function createRoomRecord() {
  return {
    id: "room-db-1",
    code: "ROOM42",
    name: "Test Room",
    status: "draft" as const,
    privacy: "private" as const,
    isPaused: false,
    currentLotId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalLots: 10,
    soldLots: 0,
    unsoldLots: 0,
  };
}

function createAccess(
  role: RoomParticipantRole,
  assignedTeamId: string | null = null,
): RoomAccessRecord {
  return {
    room: createRoomRecord(),
    user: createUser(),
    role,
    canBid: canBidForRole(role) && Boolean(assignedTeamId),
    canControlAuction: canControlAuctionForRole(role),
    inviteCode: role === "host" ? "ROOM42" : null,
    assignedTeamId,
  };
}

export const roomPermissionSuite: TestSuite = {
  name: "room-permission-service",
  tests: [
    defineTest("host has auction control and no bidding rights", () => {
      const access = createAccess("host");
      assert.equal(access.canControlAuction, true);
      assert.equal(access.canBid, false);
    }),

    defineTest("participant with team can bid but not control auction", () => {
      const access = createAccess("participant", "team-1");
      assert.equal(access.canBid, true);
      assert.equal(access.canControlAuction, false);
    }),

    defineTest("participant without team cannot bid", () => {
      const access = createAccess("participant", null);
      assert.equal(access.canBid, false);
    }),

    defineTest("viewer cannot bid or control auction", () => {
      const access = createAccess("viewer");
      assert.equal(access.canBid, false);
      assert.equal(access.canControlAuction, false);
    }),

    defineTest("host gets invite code set to room code", () => {
      const access = createAccess("host");
      assert.equal(access.inviteCode, "ROOM42");
    }),

    defineTest("non-host does not get invite code", () => {
      const participant = createAccess("participant", "team-1");
      const viewer = createAccess("viewer");
      assert.equal(participant.inviteCode, null);
      assert.equal(viewer.inviteCode, null);
    }),
  ],
};
