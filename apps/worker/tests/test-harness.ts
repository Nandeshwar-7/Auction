export type TestCase = {
  name: string;
  run: () => void | Promise<void>;
};

export type TestSuite = {
  name: string;
  tests: TestCase[];
};

export function defineTest(name: string, run: TestCase["run"]): TestCase {
  return {
    name,
    run,
  };
}

export async function runSuites(suites: TestSuite[]) {
  let failureCount = 0;
  let testCount = 0;

  for (const suite of suites) {
    for (const testCase of suite.tests) {
      testCount += 1;

      try {
        await testCase.run();
        console.log(`PASS ${suite.name} :: ${testCase.name}`);
      } catch (error) {
        failureCount += 1;
        console.error(`FAIL ${suite.name} :: ${testCase.name}`);
        console.error(error);
      }
    }
  }

  if (failureCount > 0) {
    console.error(`\n${failureCount} of ${testCount} tests failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nAll ${testCount} tests passed.`);
}
