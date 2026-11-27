// eslint-disable-next-line @typescript-eslint/no-var-requires
const { compilerOptions } = require('../../tsconfig')

module.exports = {
  displayName: 'Frontend',

  moduleDirectories: ['node_modules', '<rootDir>'],
  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testPathIgnorePatterns: ['./node_modules/'],
  resetMocks: true,

  rootDir: '../..',

  // The root of your source code, typically /src
  roots: ['<rootDir>/src/frontend'],

  testMatch: ['**/__tests__/**/*.test.ts'],
  // Jest transformations -- this adds support for TypeScript
  // using ts-jest
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },

  modulePaths: [compilerOptions.baseUrl]
}
