import fetchMock from 'jest-fetch-mock';
import nock from 'nock';

// Enable fetch mocking for downloader and integration tests
fetchMock.enableMocks();

// Enable nock for HTTP interception (used by rss-parser tests)
nock.disableNetConnect();

// Allow localhost for any local testing
nock.enableNetConnect('127.0.0.1');

// Suppress console.log during tests to keep output clean
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
};
