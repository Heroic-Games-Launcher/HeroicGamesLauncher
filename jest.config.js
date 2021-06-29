module.exports = {
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.config.js'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules',
    '<rootDir>/public',
    '<rootDir>/electron',
    '<rootDir>/dist',
    '<rootDir>/build',
    '<rootDir>/coverage'
  ],
  coverageReporters: ['text', 'html'],
  coverageThreshold: {
    './src/': {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  projects: [
    '<rootDir>/src',
    '<rootDir>/electron'
  ],

  rootDir: '.'
}
