export const describeSkipOnWindows =
  process.platform === 'win32' ? describe.skip : describe

export const testSkipOnWindows = process.platform === 'win32' ? test.skip : test
