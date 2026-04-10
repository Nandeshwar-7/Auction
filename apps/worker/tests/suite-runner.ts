/**
 * Adapts the legacy custom TestSuite harness so each TestCase becomes a vitest test.
 * Import this in .spec.ts files alongside the suite definitions.
 */
import { describe, it } from "vitest";
import type { TestSuite } from "./test-harness";

export function registerSuite(suite: TestSuite): void {
  describe(suite.name, () => {
    for (const testCase of suite.tests) {
      it(testCase.name, async () => {
        await testCase.run();
      });
    }
  });
}
