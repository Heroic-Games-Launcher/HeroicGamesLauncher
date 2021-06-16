
module.exports = {
  displayName: 'Frontend',

  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },

  moduleDirectories: [
    'node_modules',
    '<rootDir>'
  ],

  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],

  moduleNameMapper: {
    '\\.css$': '<rootDir>/src/test_helpers/mock/css.ts',
    'electron': '<rootDir>/src/test_helpers/mock/electron.ts',
    'react-i18next': '<rootDir>/src/test_helpers/mock/react-i18next.ts'
  },

  resetMocks: true,

  rootDir: '..',

  // The root of your source code, typically /src
  // `<rootDir>` is a token Jest substitutes
  roots: ['<rootDir>/src'],

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
