import { runSuites } from "./test-harness";
import { inMemoryRoomEngineSuite } from "./in-memory-room-engine.test";
import { roomPermissionSuite } from "./room-permission-service.test";
import { validationSuite } from "./validation.test";

await runSuites([
  inMemoryRoomEngineSuite,
  roomPermissionSuite,
  validationSuite,
]);
