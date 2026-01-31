// eslint-disable-next-line @typescript-eslint/no-var-requires
const { compilerOptions } = require('../../tsconfig.json')

/** @type {import('jest').Config} */
module.exports = {
  displayName: 'Backend',

  moduleDirectories: ['node_modules', '<rootDir>'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testPathIgnorePatterns: ['./node_modules/'],
  resetMocks: true,

  rootDir: '../..',

  roots: ['<rootDir>/src/backend'],

  testMatch: ['**/__tests__/**/*.test.ts'],

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json'
      }
    ]
  },

  modulePaths: [compilerOptions.baseUrl]
}
