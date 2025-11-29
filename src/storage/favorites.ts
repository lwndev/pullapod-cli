/**
 * Favorites storage module
 * Handles reading, writing, and managing favorites data
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppError, ErrorCode } from '../utils/errors';

/**
 * Favorite feed entry
 */
export interface FavoriteFeed {
  name: string;
  url: string;
  feedId: number;
  dateAdded: string; // ISO 8601 format
}

/**
 * Favorites file structure
 */
export interface FavoritesData {
  version: number;
  feeds: FavoriteFeed[];
}

/**
 * Current schema version
 */
const CURRENT_VERSION = 1;

/**
 * Empty favorites data structure
 */
const EMPTY_FAVORITES: FavoritesData = {
  version: CURRENT_VERSION,
  feeds: [],
};

/**
 * Lock file timeout in milliseconds
 */
const LOCK_TIMEOUT_MS = 5000;

/**
 * Lock file stale threshold in milliseconds (consider stale after 30 seconds)
 */
const LOCK_STALE_MS = 30000;

/**
 * Get the favorites file path based on platform and environment
 * Priority:
 * 1. XDG_CONFIG_HOME/pullapod/favorites.json (if XDG_CONFIG_HOME is set)
 * 2. ~/.config/pullapod/favorites.json (Linux/macOS)
 * 3. ~/.pullapod/favorites.json (fallback)
 */
export function getFavoritesPath(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  const homeDir = os.homedir();

  if (xdgConfigHome) {
    return path.join(xdgConfigHome, 'pullapod', 'favorites.json');
  }

  // Use ~/.config on Unix-like systems, ~/.pullapod on Windows
  if (process.platform === 'win32') {
    return path.join(homeDir, '.pullapod', 'favorites.json');
  }

  // Check if ~/.config exists, use it; otherwise fall back to ~/.pullapod
  const configDir = path.join(homeDir, '.config');
  if (fs.existsSync(configDir)) {
    return path.join(configDir, 'pullapod', 'favorites.json');
  }

  return path.join(homeDir, '.pullapod', 'favorites.json');
}

/**
 * Get valid directory prefixes for favorites file paths
 * Used to prevent path traversal attacks
 */
function getValidPathPrefixes(): string[] {
  const homeDir = os.homedir();
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;

  const prefixes = [
    path.resolve(path.join(homeDir, '.pullapod')),
    path.resolve(path.join(homeDir, '.config', 'pullapod')),
  ];

  if (xdgConfigHome) {
    prefixes.push(path.resolve(path.join(xdgConfigHome, 'pullapod')));
  }

  return prefixes;
}

/**
 * Check if running in test mode
 * Allows test files to use custom paths
 */
function isTestMode(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.PULLAPOD_TEST_MODE === 'true';
}

/**
 * Validate that a file path is within expected directories
 * Prevents path traversal attacks (Critical #3)
 * In test mode, allows any absolute path without traversal attempts
 */
function validateFavoritesPath(filePath: string): void {
  const resolved = path.resolve(filePath);

  // In test mode, allow any absolute path that doesn't contain traversal
  if (isTestMode()) {
    // Still reject obvious traversal attempts
    if (filePath.includes('..')) {
      throw new AppError(ErrorCode.INVALID_INPUT, 'Invalid favorites file path: path traversal not allowed', {
        path: filePath,
      });
    }
    return;
  }

  const validPrefixes = getValidPathPrefixes();
  const isValid = validPrefixes.some((prefix) => resolved.startsWith(prefix + path.sep) || resolved === prefix);

  if (!isValid) {
    throw new AppError(ErrorCode.INVALID_INPUT, 'Invalid favorites file path: must be within pullapod config directory', {
      path: filePath,
    });
  }
}

/**
 * Acquire a file lock for atomic operations (Critical #1)
 * Uses a lock file approach that works cross-platform
 */
function acquireLock(filePath: string): string {
  const lockPath = `${filePath}.lock`;
  const startTime = Date.now();

  // Ensure directory exists before trying to create lock file
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  while (Date.now() - startTime < LOCK_TIMEOUT_MS) {
    try {
      // Try to create lock file exclusively
      // 'wx' flag: write, fail if exists
      const fd = fs.openSync(lockPath, 'wx');
      // Write PID and timestamp for debugging/stale detection
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, time: Date.now() }));
      fs.closeSync(fd);
      return lockPath;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'EEXIST') {
        // Lock exists - check if it's stale
        try {
          const stat = fs.statSync(lockPath);
          const age = Date.now() - stat.mtimeMs;
          if (age > LOCK_STALE_MS) {
            // Lock is stale, remove it and retry
            fs.unlinkSync(lockPath);
            continue;
          }
        } catch {
          // If we can't stat the lock file, it might have been removed
          continue;
        }
        // Wait a bit and retry
        const waitTime = 50 + Math.random() * 50; // 50-100ms jitter
        const waitUntil = Date.now() + waitTime;
        while (Date.now() < waitUntil) {
          // Busy wait (sync operations don't have sleep)
        }
        continue;
      }
      throw error;
    }
  }

  throw new AppError(
    ErrorCode.FILE_WRITE_ERROR,
    'Unable to acquire lock on favorites file. Another process may be modifying it. Please try again.',
    { path: filePath }
  );
}

/**
 * Release a file lock
 */
function releaseLock(lockPath: string): void {
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch (error) {
    // Log in debug mode but don't throw
    if (process.env.DEBUG) {
      console.error(`Warning: Failed to release lock file: ${lockPath}`, error);
    }
  }
}

/**
 * Execute an operation with file locking
 */
function withFileLock<T>(filePath: string, operation: () => T): T {
  const lockPath = acquireLock(filePath);
  try {
    return operation();
  } finally {
    releaseLock(lockPath);
  }
}

/**
 * Ensure the favorites directory exists with appropriate permissions
 * Sets restrictive permissions on Unix systems (Critical #2)
 */
function ensureDirectoryExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    // Create with 700 permissions on Unix (owner only)
    // On Windows, mode is largely ignored but we set it for consistency
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

/**
 * Validate favorites data structure with semantic validation (Important #7)
 */
function validateFavoritesData(data: unknown): data is FavoritesData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Version must be a positive number
  if (typeof obj.version !== 'number' || obj.version < 1) {
    return false;
  }

  if (!Array.isArray(obj.feeds)) {
    return false;
  }

  // Validate each feed entry
  for (const feed of obj.feeds) {
    if (!feed || typeof feed !== 'object') {
      return false;
    }
    const feedObj = feed as Record<string, unknown>;

    // Type checks
    if (
      typeof feedObj.name !== 'string' ||
      typeof feedObj.url !== 'string' ||
      typeof feedObj.feedId !== 'number' ||
      typeof feedObj.dateAdded !== 'string'
    ) {
      return false;
    }

    // Semantic validation: name must not be empty
    if (feedObj.name.trim() === '') {
      return false;
    }

    // Semantic validation: feedId must be positive
    if (feedObj.feedId <= 0) {
      return false;
    }

    // Semantic validation: dateAdded must be valid ISO 8601 date
    const date = new Date(feedObj.dateAdded);
    if (isNaN(date.getTime())) {
      return false;
    }
  }

  return true;
}

/**
 * Create backup of corrupted file for recovery (Important #6)
 */
function backupCorruptedFile(filePath: string): string | null {
  try {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  } catch {
    // Continue even if backup fails
    return null;
  }
}

/**
 * Load favorites from file
 * Returns empty favorites if file doesn't exist
 * Throws if file is corrupted (with recovery guidance)
 */
export function loadFavorites(filePath?: string): FavoritesData {
  const favoritesPath = filePath || getFavoritesPath();

  // Validate path if custom path provided (Critical #3)
  if (filePath) {
    validateFavoritesPath(filePath);
  }

  if (!fs.existsSync(favoritesPath)) {
    return { ...EMPTY_FAVORITES, feeds: [] };
  }

  try {
    const content = fs.readFileSync(favoritesPath, 'utf-8');
    const data = JSON.parse(content);

    if (!validateFavoritesData(data)) {
      // Backup corrupted file before throwing (Important #6)
      const backupPath = backupCorruptedFile(favoritesPath);
      const backupMsg = backupPath ? `\nA backup has been created at: ${backupPath}` : '';

      throw new AppError(
        ErrorCode.FILE_READ_ERROR,
        `Favorites file is corrupted. The file structure is invalid.${backupMsg}\n\n` +
          'To reset your favorites, run:\n' +
          '  pullapod favorite clear --force',
        { path: favoritesPath, backup: backupPath }
      );
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      // Backup corrupted file before throwing (Important #6)
      const backupPath = backupCorruptedFile(favoritesPath);
      const backupMsg = backupPath ? `\nA backup has been created at: ${backupPath}` : '';

      throw new AppError(
        ErrorCode.FILE_READ_ERROR,
        `Favorites file is corrupted. Invalid JSON format.${backupMsg}\n\n` +
          'To reset your favorites, run:\n' +
          '  pullapod favorite clear --force',
        { path: favoritesPath, backup: backupPath, originalError: error.message }
      );
    }

    throw new AppError(
      ErrorCode.FILE_READ_ERROR,
      `Failed to read favorites file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { path: favoritesPath }
    );
  }
}

/**
 * Save favorites to file using atomic write with locking
 * Writes to a temp file first, then renames to ensure no partial writes
 * Uses file locking to prevent concurrent access issues (Critical #1)
 * Sets restrictive permissions on Unix systems (Critical #2)
 */
export function saveFavorites(data: FavoritesData, filePath?: string): void {
  const favoritesPath = filePath || getFavoritesPath();

  // Validate path if custom path provided (Critical #3)
  if (filePath) {
    validateFavoritesPath(filePath);
  }

  const tempPath = `${favoritesPath}.tmp`;

  // Use file locking for atomic operations (Critical #1)
  withFileLock(favoritesPath, () => {
    try {
      ensureDirectoryExists(favoritesPath);

      // Write to temp file first with restrictive permissions (Critical #2)
      const content = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempPath, content, {
        encoding: 'utf-8',
        mode: 0o600, // Owner read/write only on Unix
      });

      // Atomic rename
      fs.renameSync(tempPath, favoritesPath);
    } catch (error) {
      // Clean up temp file if it exists (Important #8 - log failures)
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (cleanupError) {
        // Log cleanup errors in debug mode (Important #8)
        if (process.env.DEBUG) {
          console.error(`Warning: Failed to clean up temporary file: ${tempPath}`, cleanupError);
        }
      }

      throw new AppError(
        ErrorCode.FILE_WRITE_ERROR,
        `Failed to save favorites file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { path: favoritesPath }
      );
    }
  });
}

/**
 * Add a feed to favorites
 * Returns true if added successfully, false if duplicate
 */
export function addFavorite(
  feed: FavoriteFeed,
  filePath?: string
): { success: boolean; message: string; existingFeed?: FavoriteFeed } {
  const data = loadFavorites(filePath);

  // Check for duplicate by URL
  const existingByUrl = data.feeds.find(
    (f) => f.url.toLowerCase() === feed.url.toLowerCase()
  );
  if (existingByUrl) {
    return {
      success: false,
      message: 'Feed URL already exists in favorites',
      existingFeed: existingByUrl,
    };
  }

  // Check for duplicate by feed ID
  const existingById = data.feeds.find((f) => f.feedId === feed.feedId);
  if (existingById) {
    return {
      success: false,
      message: 'Feed already exists in favorites (same feed ID)',
      existingFeed: existingById,
    };
  }

  // Add the new feed
  data.feeds.push(feed);
  saveFavorites(data, filePath);

  return {
    success: true,
    message: 'Feed added to favorites',
  };
}

/**
 * Remove a feed from favorites by name or URL
 * Returns matching feeds for confirmation or the removed feed
 */
export function findFavoriteMatches(
  query: string,
  filePath?: string
): FavoriteFeed[] {
  const data = loadFavorites(filePath);
  const queryLower = query.toLowerCase();

  // Check for exact URL match first
  const exactUrlMatch = data.feeds.find(
    (f) => f.url.toLowerCase() === queryLower
  );
  if (exactUrlMatch) {
    return [exactUrlMatch];
  }

  // Check for exact name match (case-insensitive)
  const exactNameMatch = data.feeds.find(
    (f) => f.name.toLowerCase() === queryLower
  );
  if (exactNameMatch) {
    return [exactNameMatch];
  }

  // Check for partial name matches
  const partialMatches = data.feeds.filter((f) =>
    f.name.toLowerCase().includes(queryLower)
  );

  return partialMatches;
}

/**
 * Remove a specific feed from favorites
 */
export function removeFavorite(
  feed: FavoriteFeed,
  filePath?: string
): { success: boolean; remainingCount: number } {
  const data = loadFavorites(filePath);

  const initialCount = data.feeds.length;
  data.feeds = data.feeds.filter((f) => f.feedId !== feed.feedId);

  if (data.feeds.length === initialCount) {
    return { success: false, remainingCount: data.feeds.length };
  }

  saveFavorites(data, filePath);
  return { success: true, remainingCount: data.feeds.length };
}

/**
 * Clear all favorites
 */
export function clearFavorites(filePath?: string): { removedCount: number } {
  const data = loadFavorites(filePath);
  const removedCount = data.feeds.length;

  if (removedCount > 0) {
    saveFavorites({ ...EMPTY_FAVORITES, feeds: [] }, filePath);
  }

  return { removedCount };
}

/**
 * Get all favorites sorted by date added (newest first)
 */
export function listFavorites(filePath?: string): FavoriteFeed[] {
  const data = loadFavorites(filePath);
  return [...data.feeds].sort(
    (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
  );
}

/**
 * Get the count of favorites
 */
export function getFavoritesCount(filePath?: string): number {
  const data = loadFavorites(filePath);
  return data.feeds.length;
}

/**
 * Reset favorites file (for recovery from corruption)
 */
export function resetFavorites(filePath?: string): void {
  saveFavorites({ ...EMPTY_FAVORITES, feeds: [] }, filePath);
}
