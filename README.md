# Pull a Pod

A command-line utility to download podcast episodes from RSS feeds with proper naming and artwork embedding.

## Features

### CLI Tool

- **Search for podcasts** using Podcast Index API
  - Search by keywords, title, author
  - Filter by language
  - Find feed URLs for downloading
- **Download podcast episodes** from any RSS feed
  - Filter episodes by:
    - Specific publish date
    - Date range
    - Episode name (partial match)
  - Automatically downloads episode artwork
  - Embeds artwork and metadata into MP3 files
  - Organizes downloads into podcast-specific folders
  - Clean, sanitized filenames (no GUIDs!)
  - Progress indicators for downloads

### API Clients

- **Podcast Index API Client** - Full integration with the [Podcast Index](https://podcastindex.org/)
  - Search for podcasts and episodes
  - Get trending podcasts
  - Access recent episodes and feeds
  - Retrieve podcast statistics
  - Extensible architecture for adding more API clients

## Installation

```bash
npm install -g pullapod-cli
```

Or install locally for development:

```bash
npm install
npm run build
npm link
```

## Usage

### CLI Usage

#### Search for Podcasts

First, you need to configure your Podcast Index API credentials:

```bash
# Set environment variables
export PODCAST_INDEX_API_KEY="your-api-key"
export PODCAST_INDEX_API_SECRET="your-api-secret"

# Or create a .env file
cp .env.example .env
# Edit .env and add your credentials
```

Get free API keys at https://api.podcastindex.org/

**Search Command:**

```bash
pullapod search <query> [options]
```

**Search Options:**

- `--max <number>` - Maximum number of results (1-100, default: 10)
- `--title-only` - Search titles only (more precise)
- `--similar` - Include similar matches (fuzzy matching)
- `--language <code>` - Filter by language code (e.g., "en", "es")

**Search Examples:**

```bash
# Basic search
pullapod search javascript

# Search with result limit
pullapod search "web development" --max 20

# Title-only search (more precise)
pullapod search "The Daily" --title-only

# Filter by language
pullapod search technology --language en

# Include similar matches (fuzzy search)
pullapod search "javascrpt" --similar
```

The search results will show you the feed URL which you can use with the download command below.

#### Download Podcast Episodes

```bash
# Using default command (backward compatible)
pullapod --feed <RSS_URL> [options]

# Or using explicit download subcommand
pullapod download --feed <RSS_URL> [options]
```

**Download Options:**

- `-f, --feed <url>` - RSS feed URL (required)
- `-o, --output <directory>` - Output directory (defaults to current directory)
- `-d, --date <date>` - Download episode from specific date (YYYY-MM-DD)
- `-s, --start <date>` - Start date for range download (YYYY-MM-DD)
- `-e, --end <date>` - End date for range download (YYYY-MM-DD)
- `-n, --name <name>` - Download episode by name (partial match)
- `--no-metadata` - Skip embedding artwork and metadata
- `-h, --help` - Display help
- `-V, --version` - Display version

**Download Examples:**

Download an episode from a specific date:
```bash
pullapod --feed https://example.com/podcast.rss --date 2024-01-15
# or
pullapod download --feed https://example.com/podcast.rss --date 2024-01-15
```

Download episodes from a date range:
```bash
pullapod --feed https://example.com/podcast.rss --start 2024-01-01 --end 2024-01-31
```

Download episodes by name:
```bash
pullapod --feed https://example.com/podcast.rss --name "interview"
```

Download to a specific directory:
```bash
pullapod --feed https://example.com/podcast.rss --date 2024-01-15 --output ~/Podcasts
```

Download without embedding metadata:
```bash
pullapod --feed https://example.com/podcast.rss --date 2024-01-15 --no-metadata
```

**Complete Workflow Example:**

```bash
# 1. Search for a podcast
pullapod search "javascript podcast" --max 5

# 2. Copy the feed URL from the search results
# 3. Download a specific episode
pullapod --feed https://feeds.fireside.fm/javascriptjabber/rss --date 2024-01-15
```

### API Client Usage

The project includes an extensible API client architecture for integrating with podcast-related APIs.

#### Podcast Index API

The Podcast Index API client provides access to the [Podcast Index](https://podcastindex.org/) database of podcasts.

**Setup:**

1. Register for a free API key at https://api.podcastindex.org/

2. **Option A: Using .env file (Recommended)**
   ```bash
   cp .env.example .env
   # Edit .env and add your credentials
   ```

3. **Option B: Set environment variables directly**
   ```bash
   export PODCAST_INDEX_API_KEY="your-api-key"
   export PODCAST_INDEX_API_SECRET="your-api-secret"
   ```

**Basic Usage:**

```typescript
import { PodcastIndexClient } from 'pullapod/clients';
import { loadPodcastIndexConfig, loadEnvFile } from 'pullapod/config';

// Load .env file (if using .env for configuration)
loadEnvFile();

// Load configuration from environment variables
const config = loadPodcastIndexConfig();

// Create client instance
const client = new PodcastIndexClient(config);

// Search for podcasts
const results = await client.searchByTerm({ q: 'javascript', max: 10 });
console.log(`Found ${results.count} podcasts`);

// Get trending podcasts
const trending = await client.getTrending({ lang: 'en', max: 20 });

// Get episodes by feed ID
const episodes = await client.getEpisodesByFeedId({
  id: 920666,
  max: 50
});

// Get recent episodes across all podcasts
const recent = await client.getRecentEpisodes({ max: 20 });

// Get Podcast Index statistics
const stats = await client.getStats();
console.log(`Total podcasts: ${stats.feedCountTotal.toLocaleString()}`);
```

**Available Methods:**

- **Search**: `searchByTerm()`, `searchByTitle()`
- **Podcasts**: `getPodcastById()`, `getPodcastByUrl()`, `getPodcastByItunesId()`, `getPodcastByGuid()`, `getTrending()`
- **Episodes**: `getEpisodesByFeedId()`, `getEpisodesByFeedUrl()`, `getEpisodeById()`, `getEpisodeByGuid()`, `getRandomEpisodes()`
- **Recent**: `getRecentEpisodes()`, `getRecentFeeds()`, `getNewFeeds()`
- **Stats**: `getStats()`, `getCategories()`
- **Hub**: `notifyFeedUpdate()`, `addFeed()`

**Documentation:**

- [Podcast Index API Documentation](docs/PODCAST_INDEX_API.md) - Complete API reference with detailed examples
- [API Clients Architecture](docs/API_CLIENTS.md) - Guide for adding new API clients

**Example:**

Run the included example to see the client in action:

```bash
# Copy and configure .env file
cp .env.example .env
# Edit .env with your credentials

# Run the example
npm run dev examples/podcast-index-example.ts
```

## File Organization

Downloads are organized as follows:

```
[output-directory]/
  [Podcast Name]/
    [Episode Title].mp3
    [Episode Title].jpg
```

For example:
```
~/Podcasts/
  My Favorite Podcast/
    Episode 42 - The Answer.mp3
    Episode 42 - The Answer.jpg
```

## Project Structure

```
pullapod-cli/
├── src/
│   ├── clients/              # API client implementations
│   │   ├── base-client.ts    # Abstract HTTP client
│   │   ├── podcast-index-client.ts
│   │   └── podcast-index-types.ts
│   ├── commands/             # CLI command handlers
│   │   └── search.ts         # Search command
│   ├── formatters/           # Output formatting
│   │   └── search-formatter.ts
│   ├── utils/                # Shared utilities
│   │   ├── errors.ts         # Error handling
│   │   ├── format.ts         # Text formatting
│   │   └── validation.ts     # Input validation
│   ├── config/               # Configuration management
│   │   └── env-config.ts     # Environment variable handling
│   ├── index.ts              # CLI entry point
│   ├── parser.ts             # RSS feed parser
│   ├── downloader.ts         # Episode downloader
│   ├── metadata.ts           # ID3 metadata embedding
│   ├── filter.ts             # Episode filtering
│   └── utils.ts              # Utility functions (legacy)
├── tests/                    # Jest test suite
│   ├── commands/             # Command tests
│   ├── formatters/           # Formatter tests
│   └── utils/                # Utility tests
├── docs/                     # Documentation
│   ├── requirements/         # Feature requirements
│   ├── implementation/       # Implementation plans
│   ├── PODCAST_INDEX_API.md  # Podcast Index API reference
│   └── API_CLIENTS.md        # Client architecture guide
├── examples/                 # Usage examples
│   └── podcast-index-example.ts
└── dist/                     # Compiled JavaScript
```

## Requirements

- Node.js 18.0.0 or higher

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (with ts-node)
npm run dev -- --feed <url> --date 2024-01-01
# or with explicit download command
npm run dev -- download --feed <url> --date 2024-01-01

# Watch mode
npm run watch

# Run tests
npm test

# Security audit
npm run audit
```

### Git Hooks

This project includes a pre-commit hook that runs linting and all tests before allowing commits. The hook is automatically installed when you run `npm install`.

**The pre-commit hook runs:**
- ESLint to check code style
- Unit tests
- Integration tests

If any check fails, the commit will be blocked. This helps catch issues locally before they reach CI/CD.

**Manual installation:**

If you need to reinstall the hooks:

```bash
npm run prepare
```

**Bypassing hooks:**

In rare cases where you need to bypass the hook (not recommended):

```bash
git commit --no-verify
```

## Release Process

To create a new release:

```bash
# Patch release (0.1.0 → 0.1.1) - bug fixes
npm run release:patch

# Minor release (0.1.0 → 0.2.0) - new features
npm run release:minor

# Major release (0.1.0 → 1.0.0) - breaking changes
npm run release:major
```

This will automatically:
1. Run build and tests
2. Update version in package.json and package-lock.json
3. Create a git commit with the version number
4. Create a git tag (e.g., `v0.1.1`)
5. Push commits and tags to GitHub

Once pushed, create a GitHub Release from the tag to trigger automated npm publishing.

## License

MIT
