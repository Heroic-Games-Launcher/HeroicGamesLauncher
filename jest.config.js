module.exports = {
  // The root of your source code, typically /src
  // `<rootDir>` is a token Jest substitutes
  roots: ["<rootDir>"],

  moduleDirectories: [
    "node_modules",
    "<rootDir>"
    ],

  // Jest transformations -- this adds support for TypeScript
  // using ts-jest
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },

  moduleNameMapper: {
    "\\.css$": "identity-obj-proxy",
  },

  // Test spec file resolution pattern
  // Matches parent folder `__tests__` and filename
  // should contain `test` or `spec`.
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",

  // Module file extensions for importing
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],

  coverageDirectory: "<rootDir>/coverage",

  collectCoverageFrom: [
    "**/*.{js,jsx,ts,tsx}",
    "!**/*.config.js"
  ],

  coveragePathIgnorePatterns: [
    "<rootDir>/node_modules>",
    "<rootDir>/public",
    "<rootDir>/electron",
    "<rootDir>/dist",
    "<rootDir>/build",
    "<rootDir>/coverage"
  ],

  coverageReporters: ['text', 'html']
};