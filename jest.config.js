module.exports = {
  collectCoverageFrom: ['**/*.{js,jsx,ts,tsx}', '!**/*.config.js'],
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
  projects: ['<rootDir>/electron'],

  rootDir: '.'
}
