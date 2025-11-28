# Feature Requirements: Refactor for Electron Desktop App

## Overview

Restructure the pullapod-cli codebase into a monorepo architecture that separates core business logic from the CLI interface, enabling code reuse between the CLI and a future Electron-based desktop application.

## Feature ID
`FEAT-006`

## Priority
Low - Foundation for future desktop application (implement after FEAT-003, FEAT-004, FEAT-005)

## User Story

As a developer maintaining pullapod, I want to share core business logic between the CLI and desktop app so that I can avoid code duplication and ensure consistent behavior across both interfaces.

## Goals

1. **Zero code duplication** - Core logic exists in one place
2. **Independent packages** - CLI and desktop can be versioned/released separately
3. **Backward compatibility** - Existing CLI users unaffected
4. **Clear boundaries** - Separation between core logic and interface concerns

## Target Architecture

```
pullapod/
├── packages/
│   ├── core/                     # @pullapod/core
│   │   ├── src/
│   │   │   ├── clients/          # API clients
│   │   │   │   ├── base-client.ts
│   │   │   │   ├── podcast-index-client.ts
│   │   │   │   ├── podcast-index-types.ts
│   │   │   │   └── index.ts
│   │   │   ├── services/         # Business logic services
│   │   │   │   ├── search.ts
│   │   │   │   ├── episodes.ts
│   │   │   │   ├── download.ts
│   │   │   │   ├── info.ts
│   │   │   │   ├── favorites.ts
│   │   │   │   └── index.ts
│   │   │   ├── parser.ts         # RSS parsing
│   │   │   ├── downloader.ts     # Download logic
│   │   │   ├── metadata.ts       # ID3 tagging
│   │   │   ├── filter.ts         # Episode filtering
│   │   │   ├── types.ts          # Shared types
│   │   │   ├── errors.ts         # Error types
│   │   │   └── index.ts          # Public API exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                      # pullapod (npm package)
│   │   ├── src/
│   │   │   ├── commands/         # CLI command handlers
│   │   │   │   ├── search.ts
│   │   │   │   ├── episodes.ts
│   │   │   │   ├── download.ts
│   │   │   │   ├── info.ts
│   │   │   │   ├── favorite.ts
│   │   │   │   └── recent.ts
│   │   │   ├── formatters/       # CLI output formatters
│   │   │   │   ├── search-formatter.ts
│   │   │   │   ├── episodes-formatter.ts
│   │   │   │   ├── info-formatter.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/            # CLI-specific utilities
│   │   │   │   └── progress.ts   # Progress bar handling
│   │   │   └── index.ts          # CLI entry point (Commander)
│   │   ├── package.json          # depends on @pullapod/core
│   │   └── tsconfig.json
│   │
│   └── desktop/                  # Pullapod Desktop (future)
│       ├── src/
│       │   ├── main/             # Electron main process
│       │   ├── renderer/         # UI (React/Vue/Svelte)
│       │   └── preload/          # Preload scripts
│       ├── package.json          # depends on @pullapod/core
│       └── tsconfig.json
│
├── package.json                  # Workspace root
├── pnpm-workspace.yaml           # Workspace configuration
├── tsconfig.base.json            # Shared TypeScript config
└── README.md
```

## Functional Requirements

### FR-1: Monorepo Setup

#### FR-1.1: Workspace Configuration
- Use pnpm workspaces (preferred) or npm workspaces
- Configure workspace root `package.json` with workspace paths
- Set up shared development dependencies at root level
- Configure shared scripts for building, testing, linting

#### FR-1.2: Package Naming
- Core package: `@pullapod/core` (scoped, not published initially)
- CLI package: `pullapod` (existing npm package name)
- Desktop package: `pullapod-desktop` (future)

#### FR-1.3: Inter-package Dependencies
- CLI depends on `@pullapod/core` via workspace protocol
- Use `"@pullapod/core": "workspace:*"` in package.json
- Ensure TypeScript project references work correctly

### FR-2: Core Package Extraction

#### FR-2.1: API Clients
Move to `packages/core/src/clients/`:
- `base-client.ts` - Abstract HTTP client
- `podcast-index-client.ts` - Podcast Index API implementation
- `podcast-index-types.ts` - API response types
- `index.ts` - Module exports

No changes required to client logic.

#### FR-2.2: Core Business Logic
Move to `packages/core/src/`:
- `parser.ts` - RSS feed parsing
- `downloader.ts` - Episode download logic (without progress callbacks initially)
- `metadata.ts` - ID3 tag embedding
- `filter.ts` - Episode filtering
- `types.ts` - Shared TypeScript interfaces

#### FR-2.3: Service Layer (New)
Create `packages/core/src/services/` with high-level operations:

```typescript
// services/search.ts
export interface SearchOptions {
  query: string;
  max?: number;
  titleOnly?: boolean;
  similar?: boolean;
  language?: string;
}

export interface SearchResult {
  feeds: PodcastFeed[];
  count: number;
}

export async function searchPodcasts(
  client: PodcastIndexClient,
  options: SearchOptions
): Promise<SearchResult>;
```

```typescript
// services/download.ts
export interface DownloadOptions {
  feedUrl: string;
  outputDir: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  name?: string;
  embedMetadata?: boolean;
  onProgress?: (progress: DownloadProgress) => void;
}

export interface DownloadProgress {
  episode: string;
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
}

export interface DownloadResult {
  episodes: DownloadedEpisode[];
  failed: FailedDownload[];
}

export async function downloadEpisodes(
  options: DownloadOptions
): Promise<DownloadResult>;
```

#### FR-2.4: Configuration
Move to `packages/core/src/config/`:
- `env-config.ts` - Environment variable handling
- Export configuration types and utilities

#### FR-2.5: Error Handling
Move to `packages/core/src/`:
- `errors.ts` - Custom error types (AppError, ValidationError, etc.)
- Ensure errors are serializable for IPC (Electron)

#### FR-2.6: Public API
Create `packages/core/src/index.ts` that exports:
- All service functions
- All types and interfaces
- Client classes
- Error types
- Configuration utilities

```typescript
// packages/core/src/index.ts
export * from './clients';
export * from './services';
export * from './types';
export * from './errors';
export * from './config';
```

### FR-3: CLI Package Adaptation

#### FR-3.1: Command Handlers
Refactor commands to use core services:

```typescript
// Before (in current CLI)
import { PodcastIndexClient } from '../clients';
// ... complex logic inline

// After (using core)
import { searchPodcasts, SearchOptions } from '@pullapod/core';
// ... simple delegation to service
```

#### FR-3.2: Formatters
Keep formatters in CLI package:
- `search-formatter.ts` - Format search results for terminal
- `episodes-formatter.ts` - Format episode lists for terminal
- `info-formatter.ts` - Format podcast info for terminal

Formatters are CLI-specific (colors, spacing, terminal width).

#### FR-3.3: Progress Handling
CLI-specific progress bar logic stays in CLI:
- Core provides progress callbacks
- CLI implements terminal progress bars
- Desktop will implement UI progress indicators

#### FR-3.4: Entry Point
Simplify `index.ts` to:
- Commander.js setup
- Import command handlers
- No business logic

### FR-4: Favorites Storage Abstraction

#### FR-4.1: Storage Interface
Define abstract storage interface in core:

```typescript
// packages/core/src/storage/types.ts
export interface FavoritesStorage {
  list(): Promise<Favorite[]>;
  add(favorite: Favorite): Promise<void>;
  remove(nameOrUrl: string): Promise<boolean>;
  clear(): Promise<void>;
  exists(feedId: number): Promise<boolean>;
}

export interface Favorite {
  name: string;
  url: string;
  feedId: number;
  dateAdded: string;
}
```

#### FR-4.2: File System Implementation
Create file-based implementation for CLI:

```typescript
// packages/core/src/storage/file-storage.ts
export class FileFavoritesStorage implements FavoritesStorage {
  constructor(private filePath: string) {}
  // ... implementation
}
```

#### FR-4.3: Future Storage Options
Interface allows for:
- SQLite storage (desktop app)
- IndexedDB storage (if web UI added)
- Cloud sync (future enhancement)

### FR-5: Download Progress Abstraction

#### FR-5.1: Progress Callback Interface
Define progress reporting interface:

```typescript
export interface ProgressReporter {
  onStart(episode: EpisodeInfo, totalBytes: number): void;
  onProgress(bytesDownloaded: number, totalBytes: number): void;
  onComplete(episode: EpisodeInfo): void;
  onError(episode: EpisodeInfo, error: Error): void;
}
```

#### FR-5.2: CLI Implementation
CLI implements terminal progress bars:

```typescript
// packages/cli/src/utils/progress.ts
export class TerminalProgressReporter implements ProgressReporter {
  // Uses cli-progress for terminal display
}
```

#### FR-5.3: Desktop Implementation (Future)
Desktop will implement UI progress:

```typescript
// packages/desktop/src/utils/progress.ts
export class UIProgressReporter implements ProgressReporter {
  // Sends progress to renderer via IPC
}
```

## Non-Functional Requirements

### NFR-1: Build System

#### NFR-1.1: TypeScript Configuration
- Shared `tsconfig.base.json` at root
- Package-specific `tsconfig.json` extending base
- Use TypeScript project references for faster builds
- Configure path aliases for clean imports

#### NFR-1.2: Build Scripts
- `pnpm build` - Build all packages in dependency order
- `pnpm build:core` - Build core only
- `pnpm build:cli` - Build CLI (builds core if needed)
- `pnpm watch` - Watch mode for development

#### NFR-1.3: Build Output
- Core: CommonJS and ESM dual output
- CLI: CommonJS for Node.js execution
- Desktop: ESM for Electron

### NFR-2: Testing

#### NFR-2.1: Test Organization
- Core tests in `packages/core/tests/`
- CLI tests in `packages/cli/tests/`
- Shared test utilities at root or in core

#### NFR-2.2: Test Scripts
- `pnpm test` - Run all tests
- `pnpm test:core` - Run core tests only
- `pnpm test:cli` - Run CLI tests only
- `pnpm test:integration` - Run integration tests

#### NFR-2.3: Coverage
- Maintain >80% coverage for core package
- Maintain >80% coverage for CLI package
- Combined coverage reporting

### NFR-3: Development Experience

#### NFR-3.1: Hot Reload
- `pnpm dev` should enable watch mode
- Changes to core should trigger CLI rebuild
- Fast iteration during development

#### NFR-3.2: IDE Support
- Configure VSCode workspace settings
- TypeScript paths should resolve correctly
- Go-to-definition should work across packages

#### NFR-3.3: Debugging
- Source maps enabled for all packages
- Debug configurations for CLI and tests

### NFR-4: Publishing

#### NFR-4.1: Package Independence
- Core is private (not published to npm)
- CLI is public (existing `pullapod` package)
- CLI bundles core at build time

#### NFR-4.2: Versioning
- Independent versioning per package
- Core version changes trigger CLI patch bump
- Use changesets or similar for coordinated releases

### NFR-5: Backward Compatibility

#### NFR-5.1: CLI Interface
- No changes to CLI command syntax
- No changes to CLI output format
- Existing users unaffected by refactor

#### NFR-5.2: npm Package
- `pullapod` npm package continues to work
- Same installation process
- Same usage patterns

## Migration Steps

### Step 1: Repository Setup
1. Initialize pnpm workspace at repo root
2. Create `packages/` directory structure
3. Create workspace configuration files
4. Set up shared TypeScript configuration

### Step 2: Create Core Package
1. Create `packages/core/` with package.json
2. Move client code to core
3. Move parser, downloader, metadata, filter to core
4. Move types and errors to core
5. Create service layer wrapping existing logic
6. Create public API exports
7. Add core-specific tests

### Step 3: Create CLI Package
1. Create `packages/cli/` with package.json
2. Move Commander setup and commands
3. Move formatters
4. Update imports to use `@pullapod/core`
5. Implement CLI-specific progress handling
6. Add CLI-specific tests

### Step 4: Update Build System
1. Configure TypeScript project references
2. Update build scripts
3. Update test scripts
4. Update lint configuration
5. Update CI/CD pipeline

### Step 5: Validation
1. Run full test suite
2. Test CLI manually with all commands
3. Verify npm package works correctly
4. Test installation from local path
5. Compare behavior before/after refactor

## Dependencies

### Root Dependencies (devDependencies)
- `typescript` - Shared TypeScript version
- `@types/node` - Node.js types
- `jest` - Test runner
- `eslint` - Linting
- `prettier` - Code formatting
- `pnpm` - Package manager (implicit)

### Core Package Dependencies
- `rss-parser` - RSS feed parsing
- `node-id3` - ID3 tag embedding
- `sanitize-filename` - Filename sanitization
- `dotenv` - Environment configuration

### CLI Package Dependencies
- `commander` - CLI framework
- `cli-progress` - Terminal progress bars
- `@pullapod/core` - Core package (workspace)

## Edge Cases

1. **Circular dependencies**: Ensure no circular imports between packages
2. **Type-only imports**: Use `import type` for types to avoid runtime issues
3. **Node.js version**: Ensure all packages support Node.js 18+
4. **Path resolution**: Handle different working directories correctly
5. **Error serialization**: Ensure errors can be serialized for IPC
6. **Progress callback errors**: Handle errors in progress callbacks gracefully
7. **Partial builds**: Handle incremental builds correctly
8. **Clean builds**: Ensure `pnpm clean && pnpm build` works
9. **IDE caching**: Document when to restart TypeScript server
10. **Global installation**: Verify `npm install -g pullapod` still works

## Testing Requirements

### Unit Tests
- Core service functions work correctly
- Storage interface implementations work
- Progress callback handling
- Error propagation from core to CLI
- Type exports are correct

### Integration Tests
- CLI commands use core services correctly
- End-to-end command execution
- Cross-package imports resolve correctly
- Build output is valid

### Manual Testing
- Install CLI globally and test all commands
- Verify no regression in functionality
- Test on Linux, macOS, Windows
- Verify npm package installation

## Future Enhancements

- Add `packages/desktop/` for Electron app
- Add `packages/shared-ui/` for shared UI components
- Add JSON output mode to core services for GUI consumption
- Add event emitter pattern for real-time updates
- Add cancellation support for long-running operations
- Create `@pullapod/types` package for shared types
- Add WebSocket support for real-time progress in desktop

## Acceptance Criteria

- [ ] Monorepo structure created with pnpm workspaces
- [ ] Core package contains all business logic
- [ ] CLI package depends on core package
- [ ] All existing CLI commands work identically
- [ ] All existing tests pass
- [ ] New tests added for core services
- [ ] Build system produces correct output
- [ ] TypeScript project references configured
- [ ] IDE navigation works across packages
- [ ] npm installation of CLI works correctly
- [ ] Global installation works correctly
- [ ] Documentation updated for new structure
- [ ] CI/CD pipeline updated
- [ ] No performance regression
