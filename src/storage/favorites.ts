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
 * Ensure the favorites directory exists
 */
function ensureDirectoryExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Validate favorites data structure
 */
function validateFavoritesData(data: unknown): data is FavoritesData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'number') {
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
    if (
      typeof feedObj.name !== 'string' ||
      typeof feedObj.url !== 'string' ||
      typeof feedObj.feedId !== 'number' ||
      typeof feedObj.dateAdded !== 'string'
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Load favorites from file
 * Returns empty favorites if file doesn't exist
 * Throws if file is corrupted
 */
export function loadFavorites(filePath?: string): FavoritesData {
  const favoritesPath = filePath || getFavoritesPath();

  if (!fs.existsSync(favoritesPath)) {
    return { ...EMPTY_FAVORITES, feeds: [] };
  }

  try {
    const content = fs.readFileSync(favoritesPath, 'utf-8');
    const data = JSON.parse(content);

    if (!validateFavoritesData(data)) {
      throw new AppError(
        ErrorCode.FILE_READ_ERROR,
        'Favorites file is corrupted. The file structure is invalid.',
        { path: favoritesPath }
      );
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new AppError(
        ErrorCode.FILE_READ_ERROR,
        'Favorites file is corrupted. Invalid JSON format.',
        { path: favoritesPath, originalError: error.message }
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
 * Save favorites to file using atomic write
 * Writes to a temp file first, then renames to ensure no partial writes
 */
export function saveFavorites(data: FavoritesData, filePath?: string): void {
  const favoritesPath = filePath || getFavoritesPath();
  const tempPath = `${favoritesPath}.tmp`;

  try {
    ensureDirectoryExists(favoritesPath);

    // Write to temp file first
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, content, 'utf-8');

    // Atomic rename
    fs.renameSync(tempPath, favoritesPath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }

    throw new AppError(
      ErrorCode.FILE_WRITE_ERROR,
      `Failed to save favorites file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { path: favoritesPath }
    );
  }
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
