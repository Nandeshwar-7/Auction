import assert from "node:assert/strict";

import { createInMemoryRoomEngine } from "@auction/shared";
import { ROOM_EVENT_TYPES } from "@auction/shared";
import type { RoomEngineResult, RoomEngineSuccess } from "@auction/shared";
import { TestRoomPersistence } from "./support/test-room-persistence";
import { defineTest, type TestSuite } from "./test-harness";

function expectSuccess(result: RoomEngineResult): RoomEngineSuccess {
  assert.equal(result.ok, true);
  return result;
}

function getSnapshot(result: RoomEngineResult) {
  const success = expectSuccess(result);
  const snapshotEvent = success.events.find(
    (event) => event.type === ROOM_EVENT_TYPES.roomSnapshot,
  );

  assert.ok(snapshotEvent && "snapshot" in snapshotEvent);
  return snapshotEvent.snapshot;
}

export const inMemoryRoomEngineSuite: TestSuite = {
  name: "in-memory-room-engine",
  tests: [
    defineTest("joinRoom returns the persisted lobby snapshot", async () => {
      const persistence = new TestRoomPersistence({
        teamCount: 8,
        memberCount: 8,
        roomCode: "ROOM42",
      });
      const engine = createInMemoryRoomEngine(persistence);

      const result = await engine.joinRoom("ROOM42");
      const snapshot = getSnapshot(result);

      assert.equal(snapshot.roomStatus, "draft");
      assert.equal(snapshot.memberCount, 8);
      assert.equal(snapshot.members[0]?.role, "host");
      assert.equal(snapshot.currentPlayer, null);
    }),

    defineTest("startAuction, placeBid, and markSold persist the winning outcome", async () => {
      const persistence = new TestRoomPersistence();
      const engine = createInMemoryRoomEngine(persistence);

      await engine.joinRoom("ROOM42");
      const started = await engine.startAuction("ROOM42");
      const startedSnapshot = getSnapshot(started);

      assert.equal(startedSnapshot.phase, "live");
      assert.equal(startedSnapshot.currentPlayer?.id, "player-1");
      assert.equal(startedSnapshot.currentBidLakhs, 200);

      const firstBid = await engine.placeBid("ROOM42", "team-1");
      const firstBidSnapshot = getSnapshot(firstBid);
      assert.equal(firstBidSnapshot.currentBidLakhs, 200);
      assert.equal(firstBidSnapshot.highestBidderId, "team-1");

      const secondBid = await engine.placeBid("ROOM42", "team-2");
      const secondBidSnapshot = getSnapshot(secondBid);
      assert.equal(secondBidSnapshot.currentBidLakhs, 210);
      assert.equal(secondBidSnapshot.highestBidderId, "team-2");

      const soldResult = await engine.markSold("ROOM42");
      const soldSnapshot = getSnapshot(soldResult);

      assert.equal(soldSnapshot.saleOutcome, "sold");
      assert.equal(soldSnapshot.phase, "sold");
      assert.equal(soldSnapshot.teams.find((team) => team.id === "team-2")?.purseRemainingLakhs, 390);

      const persistedState = persistence.getState();
      const settledLot = persistedState.lots.find((lot) => lot.id === "lot-1");

      assert.equal(settledLot?.status, "sold");
      assert.equal(settledLot?.soldToTeamId, "team-2");
      assert.equal(settledLot?.soldPrice, 210);
    }),

    defineTest("markUnsold closes a live lot without mutating purse balances", async () => {
      const persistence = new TestRoomPersistence();
      const engine = createInMemoryRoomEngine(persistence);

      await engine.joinRoom("ROOM42");
      await engine.startAuction("ROOM42");

      const result = await engine.markUnsold("ROOM42");
      const snapshot = getSnapshot(result);

      assert.equal(snapshot.phase, "unsold");
      assert.equal(snapshot.saleOutcome, "unsold");
      assert.equal(snapshot.highestBidderId, null);
      assert.equal(snapshot.teams.every((team) => team.purseRemainingLakhs === 600), true);
    }),

    defineTest("room state recovers after engine restart from persisted storage", async () => {
      const persistence = new TestRoomPersistence();
      const firstEngine = createInMemoryRoomEngine(persistence);

      await firstEngine.joinRoom("ROOM42");
      await firstEngine.startAuction("ROOM42");
      await firstEngine.placeBid("ROOM42", "team-1");
      await firstEngine.placeBid("ROOM42", "team-2");
      await firstEngine.pauseAuction("ROOM42");

      const recoveredEngine = createInMemoryRoomEngine(persistence);
      const recovered = await recoveredEngine.joinRoom("ROOM42");
      const snapshot = getSnapshot(recovered);

      assert.equal(snapshot.phase, "paused");
      assert.equal(snapshot.highestBidderId, "team-2");
      assert.equal(snapshot.currentBidLakhs, 210);
      assert.equal(snapshot.currentPlayer?.id, "player-1");
      assert.equal(snapshot.bidHistory.filter((entry) => entry.type === "bid").length, 2);
    }),

    defineTest(
      "concurrent bids from eight participants preserve deterministic order and purse rules",
      async () => {
        const persistence = new TestRoomPersistence({
          teamCount: 8,
          memberCount: 8,
          lowPurseTeamIndex: 7,
          lowPurseLakhs: 250,
        });
        const engine = createInMemoryRoomEngine(persistence);

        const joinResults = await Promise.all(
          Array.from({ length: 8 }, () => engine.joinRoom("ROOM42")),
        );

        assert.equal(joinResults.every((result) => result.ok), true);

        await engine.startAuction("ROOM42");

        const bidResults = await Promise.all(
          Array.from({ length: 8 }, (_, index) =>
            engine.placeBid("ROOM42", `team-${index + 1}`),
          ),
        );

        const accepted = bidResults.filter((result) => result.ok);
        const rejected = bidResults.filter((result) => !result.ok);

        assert.equal(accepted.length, 7);
        assert.equal(rejected.length, 1);
        assert.equal(rejected[0]?.ok, false);
        if (!rejected[0]?.ok) {
          assert.equal(rejected[0].error.code, "INSUFFICIENT_PURSE");
        }

        const finalSnapshot = getSnapshot(await engine.joinRoom("ROOM42"));
        const bidAmounts = finalSnapshot.bidHistory
          .filter((entry) => entry.type === "bid")
          .map((entry) => entry.amountLakhs);

        assert.deepEqual(bidAmounts, [260, 250, 240, 230, 220, 210, 200]);
        assert.equal(finalSnapshot.currentBidLakhs, 260);
        assert.equal(finalSnapshot.highestBidderId, "team-7");
        assert.equal(finalSnapshot.teams.find((team) => team.id === "team-8")?.purseRemainingLakhs, 250);
      },
    ),
  ],
};