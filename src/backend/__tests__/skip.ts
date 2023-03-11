export const describeSkipOnWindows =
  process.platform === 'win32' ? describe.skip : describe
