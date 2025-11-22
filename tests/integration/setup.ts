/**
 * Setup file for integration tests
 *
 * Integration tests make real API calls, so we don't use nock.
 * This file provides minimal setup for integration test execution.
 */

// Suppress console.log during tests to keep output clean
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
};
