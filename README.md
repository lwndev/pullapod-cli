# Pull a Pod

A command-line utility to download podcast episodes from RSS feeds with proper naming and artwork embedding.

## Features

- Download podcast episodes from any RSS feed
- Filter episodes by:
  - Specific publish date
  - Date range
  - Episode name (partial match)
- Automatically downloads episode artwork
- Embeds artwork and metadata into MP3 files
- Organizes downloads into podcast-specific folders
- Clean, sanitized filenames (no GUIDs!)
- Progress indicators for downloads

## Installation

This package is published to both npmjs.org and GitHub Packages.

### Option 1: Install from npmjs.org (Recommended - No auth required)

```bash
npm install -g pullapod
```

### Option 2: Install from GitHub Packages

First, configure npm to use GitHub Packages for the `@lwndev` scope.

Create or edit `~/.npmrc` and add:

```
@lwndev:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

To create a GitHub token:
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with `read:packages` scope
3. Copy the token and replace `YOUR_GITHUB_TOKEN` above

Then install:

```bash
npm install -g @lwndev/pullapod
```

### Or install locally for development:

```bash
npm install
npm run build
npm link
```

## Usage

```bash
pullapod --feed <RSS_URL> [options]
```

### Options

- `-f, --feed <url>` - RSS feed URL (required)
- `-o, --output <directory>` - Output directory (defaults to current directory)
- `-d, --date <date>` - Download episode from specific date (YYYY-MM-DD)
- `-s, --start <date>` - Start date for range download (YYYY-MM-DD)
- `-e, --end <date>` - End date for range download (YYYY-MM-DD)
- `-n, --name <name>` - Download episode by name (partial match)
- `--no-metadata` - Skip embedding artwork and metadata
- `-h, --help` - Display help
- `-V, --version` - Display version

### Examples

Download an episode from a specific date:
```bash
pullapod --feed https://example.com/podcast.rss --date 2024-01-15
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

# Watch mode
npm run watch

# Run tests
npm test

# Security audit
npm run audit
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
