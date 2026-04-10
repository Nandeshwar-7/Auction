import assert from "node:assert/strict";

import { ROOM_EVENT_TYPES } from "@auction/shared";
import type { ClientToServerEvent } from "@auction/shared";
import { defineTest, type TestSuite } from "./test-harness";

function parseClientEvent(raw: string): ClientToServerEvent | null {
  try {
    return JSON.parse(raw) as ClientToServerEvent;
  } catch {
    return null;
  }
}

export const validationSuite: TestSuite = {
  name: "validation",
  tests: [
    defineTest("parseClientEvent accepts valid join_room payload", () => {
      const raw = JSON.stringify({ type: ROOM_EVENT_TYPES.joinRoom, roomId: "ROOM42" });
      const event = parseClientEvent(raw);
      assert.ok(event);
      assert.equal(event.type, ROOM_EVENT_TYPES.joinRoom);
    }),

    defineTest("parseClientEvent accepts valid place_bid payload", () => {
      const raw = JSON.stringify({ type: ROOM_EVENT_TYPES.placeBid, roomId: "ROOM42", teamId: "team-1" });
      const event = parseClientEvent(raw);
      assert.ok(event);
      assert.equal(event.type, ROOM_EVENT_TYPES.placeBid);
    }),

    defineTest("parseClientEvent accepts valid host events", () => {
      const hostEvents = [
        ROOM_EVENT_TYPES.startAuction,
        ROOM_EVENT_TYPES.markSold,
        ROOM_EVENT_TYPES.markUnsold,
        ROOM_EVENT_TYPES.pauseAuction,
        ROOM_EVENT_TYPES.resumeAuction,
        ROOM_EVENT_TYPES.closeCurrentLot,
      ];

      for (const type of hostEvents) {
        const raw = JSON.stringify({ type, roomId: "ROOM42" });
        const event = parseClientEvent(raw);
        assert.ok(event, `Expected event for type: ${type}`);
        assert.equal(event.type, type);
      }
    }),

    defineTest("parseClientEvent returns null for malformed JSON", () => {
      const result = parseClientEvent("not-json{{{");
      assert.equal(result, null);
    }),

    defineTest("parseClientEvent returns null for empty string", () => {
      const result = parseClientEvent("");
      assert.equal(result, null);
    }),

    defineTest("room event types constants are defined", () => {
      const required = [
        "join_room", "place_bid", "start_auction", "mark_sold", "mark_unsold",
        "pause_auction", "resume_auction", "close_current_lot",
        "room_snapshot", "bid_accepted", "timer_updated", "lot_started",
        "player_sold", "player_unsold", "auction_paused", "auction_resumed", "room_error",
      ] as const;

      const values = Object.values(ROOM_EVENT_TYPES);
      for (const v of required) {
        assert.ok(values.includes(v as typeof values[number]), `Missing event type: ${v}`);
      }
    }),
  ],
};
