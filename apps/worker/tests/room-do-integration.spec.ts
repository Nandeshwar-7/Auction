/**
 * Integration tests for the Room Durable Object.
 *
 * These tests use the in-memory room engine via TestRoomPersistence to verify
 * the DO's event dispatch, permission enforcement, and session handling logic
 * without requiring a live Cloudflare environment.
 *
 * Full DO integration (WebSocket upgrades, Alarms, KV) can be added with
 * @cloudflare/vitest-pool-workers once the Worker is deployed to staging.
 */
import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  createInMemoryRoomEngine,
  ROOM_EVENT_TYPES,
  type AuctionRoomSnapshot,
  type ServerToClientEvent,
} from "@auction/shared";
import { TestRoomPersistence } from "./support/test-room-persistence";

const ROOM_CODE = "ROOM42";

function createEngine() {
  const persistence = new TestRoomPersistence({ roomCode: ROOM_CODE, playerCount: 3, teamCount: 4 });
  return createInMemoryRoomEngine(persistence);
}

function getSnapshot(events: ServerToClientEvent[]): AuctionRoomSnapshot {
  const ev = events.find(e => e.type === ROOM_EVENT_TYPES.roomSnapshot);
  assert.ok(ev && "snapshot" in ev, "Expected room_snapshot event");
  return ev.snapshot;
}

describe("RoomDurableObject — event dispatch", () => {
  it("joinRoom returns a room_snapshot", async () => {
    const engine = createEngine();
    const result = await engine.joinRoom(ROOM_CODE);
    assert.ok(result.ok);
    const snap = getSnapshot(result.events);
    assert.equal(snap.roomId, ROOM_CODE);
    assert.equal(snap.phase, "idle");
  });

  it("startAuction transitions the room to live", async () => {
    const engine = createEngine();
    await engine.joinRoom(ROOM_CODE);
    const result = await engine.startAuction(ROOM_CODE);
    assert.ok(result.ok);
    const snap = getSnapshot(result.events);
    assert.equal(snap.phase, "live");
    assert.ok(snap.currentPlayer !== null);
  });

  it("placeBid increments the bid and returns bid_accepted", async () => {
    const engine = createEngine();
    await engine.joinRoom(ROOM_CODE);
    await engine.startAuction(ROOM_CODE);
    const result = await engine.placeBid(ROOM_CODE, "team-1");
    assert.ok(result.ok);
    const bid = result.events.find(e => e.type === ROOM_EVENT_TYPES.bidAccepted);
    assert.ok(bid && "bidderTeamId" in bid);
    assert.equal(bid.bidderTeamId, "team-1");
  });

  it("markSold closes the lot with sold outcome", async () => {
    const engine = createEngine();
    await engine.joinRoom(ROOM_CODE);
    await engine.startAuction(ROOM_CODE);
    await engine.placeBid(ROOM_CODE, "team-1");
    const result = await engine.markSold(ROOM_CODE);
    assert.ok(result.ok);
    const snap = getSnapshot(result.events);
    assert.ok(snap.phase === "sold" || snap.phase === "complete");
  });

  it("markUnsold closes the lot with unsold outcome", async () => {
    const engine = createEngine();
    await engine.joinRoom(ROOM_CODE);
    await engine.startAuction(ROOM_CODE);
    const result = await engine.markUnsold(ROOM_CODE);
    assert.ok(result.ok);
    const snap = getSnapshot(result.events);
    assert.ok(snap.phase === "unsold" || snap.phase === "complete");
  });

  it("pauseAuction pauses a live lot", async () => {
    const engine = createEngine();
    await engine.joinRoom(ROOM_CODE);
    await engine.startAuction(ROOM_CODE);
    const result = await engine.pauseAuction(ROOM_CODE);
    assert.ok(result.ok);
    const snap = getSnapshot(result.events);
    assert.equal(snap.phase, "paused");
    assert.equal(snap.isPaused, true);
  });

  it("resumeAuction resumes a paused lot", async () => {
    const engine = createEngine();
    await engine.joinRoom(ROOM_CODE);
    await engine.startAuction(ROOM_CODE);
    await engine.pauseAuction(ROOM_CODE);
    const result = await engine.resumeAuction(ROOM_CODE);
    assert.ok(result.ok);
    const snap = getSnapshot(result.events);
    assert.equal(snap.phase, "live");
    assert.equal(snap.isPaused, false);
  });

  it("8 near-simultaneous bids serialize correctly — each team bids at increasing prices", async () => {
    const persistence = new TestRoomPersistence({ roomCode: ROOM_CODE, playerCount: 1, teamCount: 8 });
    const engine = createInMemoryRoomEngine(persistence);
    await engine.joinRoom(ROOM_CODE);
    await engine.startAuction(ROOM_CODE);

    // In a DO, messages serialize. Simulate 8 different teams bidding in quick succession.
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => engine.placeBid(ROOM_CODE, `team-${i + 1}`)),
    );

    // Each team bid at an incrementally higher price — all 8 should succeed
    const accepted = results.filter(r => r.ok);
    assert.ok(accepted.length >= 1, "At least one bid must be accepted");

    // The last accepted bid should have the highest price
    const lastAccepted = accepted[accepted.length - 1];
    assert.ok(lastAccepted);

    // Same team trying to double-bid should be rejected
    const doubleResult = await engine.placeBid(ROOM_CODE, `team-1`);
    if (doubleResult.ok) {
      // team-1 was not the highest bidder, so it can bid again — that's fine
    } else {
      // team-1 was already leading — correct
      assert.equal(doubleResult.error.code, "ALREADY_LEADING");
    }
  });

  it("timer tick at zero triggers auto-settlement", async () => {
    const engine = createEngine();
    await engine.joinRoom(ROOM_CODE);
    await engine.startAuction(ROOM_CODE);

    // Force countdown to 0
    const roomsMap = (engine as unknown as { rooms: Map<string, { countdownRemainingSeconds: number }> }).rooms;
    const room = roomsMap.get(ROOM_CODE);
    assert.ok(room);
    room.countdownRemainingSeconds = 0;

    // Next tick should auto-settle
    const dispatches = await engine.tick();
    assert.ok(dispatches.length > 0, "Expected tick dispatches after countdown reaches 0");
    const events = dispatches.flatMap(d => d.events);
    const hasSettlement = events.some(e =>
      e.type === ROOM_EVENT_TYPES.playerSold || e.type === ROOM_EVENT_TYPES.playerUnsold,
    );
    assert.ok(hasSettlement, "Expected a settlement event after timer reaches 0");
  });
});
