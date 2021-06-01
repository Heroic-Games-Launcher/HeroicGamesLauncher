module.exports = {
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.config.js'
  ],

  coverageDirectory: '<rootDir>/coverage',

  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules>',
    '<rootDir>/public',
    '<rootDir>/electron',
    '<rootDir>/dist',
    '<rootDir>/build',
    '<rootDir>/coverage'
  ],

  coverageReporters: ['text', 'html'],

  moduleDirectories: [
    'node_modules',
    '<rootDir>'
  ],

  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],

  moduleNameMapper: {
    '\\.css$': '<rootDir>/src/test_helpers/mock/css.ts',
    'electron': '<rootDir>/src/test_helpers/mock/electron.ts'
  },

  resetMocks: true,

  // The root of your source code, typically /src
  // `<rootDir>` is a token Jest substitutes
  roots: ['<rootDir>'],

  setupFilesAfterEnv: ['<rootDir>/src/test_helpers/setupTests.ts'],

  // Test spec file resolution pattern
  // should contain `test` or `spec`.
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',

  // Jest transformations -- this adds support for TypeScript
  // using ts-jest
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
