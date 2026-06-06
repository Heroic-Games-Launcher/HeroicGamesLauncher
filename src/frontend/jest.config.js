// eslint-disable-next-line @typescript-eslint/no-var-requires
const { testEnvironment } = require('../../jest.config')
const { compilerOptions } = require('../../tsconfig')

module.exports = {
  displayName: 'Frontend',

  moduleDirectories: ['node_modules', '<rootDir>'],
  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testPathIgnorePatterns: ['./node_modules/'],
  resetMocks: true,
  testEnvironment: 'jsdom',

  rootDir: '../..',

  // The root of your source code, typically /src
  // `<rootDir>` is a token Jest substitutes
  roots: ['<rootDir>/src/frontend'],

  testMatch: ['**/__tests__/**/*.test.tsx'],
  // Jest transformations -- this adds support for TypeScript
  // using ts-jest
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },

  moduleNameMapper: {
    '^.+\\.(css|less|scss)$': 'identity-obj-proxy'
  },

  modulePaths: [compilerOptions.baseUrl]
}
