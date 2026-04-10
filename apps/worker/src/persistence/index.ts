import type { RoomEnginePersistence } from "@auction/shared";
import postgres from "postgres";

import {
  dbGetRoomHydrationData,
  dbPersistBid,
  dbPersistLotSettlement,
  dbPersistNextLotActivation,
  dbPersistAuctionPause,
  type Sql,
} from "./queries";

export type { Sql };
export * from "./queries";

type PostgresFn = (connectionString: string, options?: Record<string, unknown>) => Sql;

function getPostgres(): PostgresFn {
  // Wrangler/esbuild may interop the package as `{ default: fn }`; `postgres` is ESM with a default export.
  const mod = postgres as unknown as PostgresFn | { default: PostgresFn };
  return typeof mod === "function" ? mod : mod.default;
}

export function createSql(hyperdrive: Hyperdrive): Sql {
  return getPostgres()(hyperdrive.connectionString, { max: 5 }) as Sql;
}

export function createPostgresPersistence(sql: Sql): RoomEnginePersistence {
  return {
    getRoomHydrationData: (roomCode) => dbGetRoomHydrationData(sql, roomCode),
    persistBid: (input) => dbPersistBid(sql, input),
    persistLotSettlement: (input) => dbPersistLotSettlement(sql, input),
    persistNextLotActivation: (input) => dbPersistNextLotActivation(sql, input),
    persistAuctionPause: (input) => dbPersistAuctionPause(sql, input),
  };
}
