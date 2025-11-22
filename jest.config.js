/**
 * Jest configuration with separate projects for unit and integration tests
 *
 * Usage:
 * - npm test → Run unit tests only (fast, always run)
 * - npm run test:integration → Run integration tests (requires API credentials)
 * - npm run test:all → Run all tests
 */

const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
};

module.exports = {
  projects: [
    // Unit tests - fast, no external dependencies
    {
      ...baseConfig,
      displayName: 'unit',
      roots: ['<rootDir>/tests/unit'],
      testMatch: ['**/*.test.ts'],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/index.ts', // Exclude CLI entry point
        '!src/types.ts', // Exclude type definitions
      ],
      coverageDirectory: 'coverage/unit',
      setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.ts'],
    },
    // Integration tests - require API credentials, slower
    {
      ...baseConfig,
      displayName: 'integration',
      roots: ['<rootDir>/tests/integration'],
      testMatch: ['**/*.test.ts'],
      coverageDirectory: 'coverage/integration',
      // Integration tests need real network access (no nock)
      setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
    },
  ],
};
