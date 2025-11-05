# Feature Requirements: Favorite Command

## Overview

Enable users to maintain a minimal bookmark system for frequently-checked podcast feeds to support the Recent command (FEAT-004) and provide quick access to feed URLs.

## Feature ID
`FEAT-005`

## Priority
Medium - Supporting feature for Recent command

## User Story

As a podcast listener, I want to save my frequently-checked podcast feeds so that I can quickly see recent episodes without searching each time.

## Command Syntax

```bash
pullapod favorite add <feed-url> [--name <name>]
pullapod favorite list
pullapod favorite remove <name|url>
pullapod favorite clear [--force]
```

## Subcommands

### 1. Add Command

**Syntax:**
```bash
pullapod favorite add <feed-url> [--name <name>]
```

**Arguments:**
- `<feed-url>` (required) - RSS feed URL to save

**Options:**
- `--name <name>` - Custom name for the feed (optional)

**Examples:**
```bash
# Add feed (auto-fetch podcast name)
pullapod favorite add https://feeds.fireside.fm/javascriptjabber/rss

# Add feed with custom name
pullapod favorite add https://feeds.example.com/feed.xml --name "My Podcast"
```

### 2. List Command

**Syntax:**
```bash
pullapod favorite list
```

**Arguments:** None

**Options:** None

**Examples:**
```bash
# List all saved favorites
pullapod favorite list
```

### 3. Remove Command

**Syntax:**
```bash
pullapod favorite remove <name|url>
```

**Arguments:**
- `<name|url>` (required) - Feed name or URL to remove

**Options:** None

**Examples:**
```bash
# Remove by name
pullapod favorite remove "JavaScript Jabber"

# Remove by URL
pullapod favorite remove https://feeds.fireside.fm/javascriptjabber/rss

# Remove by partial name match
pullapod favorite remove jabber
```

### 4. Clear Command

**Syntax:**
```bash
pullapod favorite clear [--force]
```

**Arguments:** None

**Options:**
- `--force` - Skip confirmation prompt

**Examples:**
```bash
# Clear all favorites (with confirmation)
pullapod favorite clear

# Clear without confirmation
pullapod favorite clear --force
```

## Functional Requirements

### FR-1: Add Feed

#### FR-1.1: Feed Validation
- Validate feed URL format before API call
- Query Podcast Index API to verify feed exists
- Use `getPodcastByUrl()` to fetch feed metadata
- Display error if feed not found or invalid

#### FR-1.2: Name Handling
- If `--name` provided: Use custom name
- If `--name` not provided: Auto-fetch podcast title from API
- Validate name is not empty after auto-fetch
- Fall back to URL if title unavailable

#### FR-1.3: Duplicate Prevention
- Check if feed URL already in favorites
- Check if feed ID already in favorites (handle URL variations)
- Display error if duplicate found
- Show existing entry details

#### FR-1.4: Data Storage
Store for each favorite:
- `name`: Podcast name (custom or fetched)
- `url`: RSS feed URL (canonical from API if available)
- `feedId`: Podcast Index feed ID
- `dateAdded`: ISO 8601 timestamp of when added

#### FR-1.5: Success Confirmation
- Display success message with feed name
- Show feed ID and URL
- Display total favorites count

### FR-2: List Feeds

#### FR-2.1: Display Format
- Show numbered list of favorites
- Display: name, URL, date added
- Sort by date added (newest first) or alphabetically by name
- Show total count

#### FR-2.2: Empty List Handling
- Display friendly message if no favorites
- Suggest adding feeds
- Exit gracefully with exit code 0

### FR-3: Remove Feed

#### FR-3.1: Matching Logic
- Support removal by exact name match (case-insensitive)
- Support removal by exact URL match
- Support removal by partial name match (if unambiguous)
- Display error if multiple matches found
- Display error if no matches found

#### FR-3.2: Confirmation
- Display feed details to be removed
- Ask for confirmation: "Remove [feed name]? (y/n)"
- Skip confirmation if only one favorite exists (assume yes)
- Allow --force flag to skip confirmation (future enhancement)

#### FR-3.3: Success Message
- Display success message with feed name
- Show remaining favorites count

### FR-4: Clear All

#### FR-4.1: Confirmation
- Display warning: "Remove all X favorites?"
- Require explicit confirmation unless `--force` flag
- Accept y/yes (case-insensitive)
- Cancel on n/no or any other input

#### FR-4.2: Success Message
- Display count of removed favorites
- Confirm favorites list is empty

### FR-5: Storage Management

#### FR-5.1: File Location
- Primary: `~/.config/pullapod/favorites.json`
- Fallback: `~/.pullapod/favorites.json`
- Use XDG_CONFIG_HOME if set: `$XDG_CONFIG_HOME/pullapod/favorites.json`
- Create directory if doesn't exist

#### FR-5.2: File Structure
```json
{
  "version": 1,
  "feeds": [
    {
      "name": "JavaScript Jabber",
      "url": "https://feeds.fireside.fm/javascriptjabber/rss",
      "feedId": 920666,
      "dateAdded": "2024-01-10T12:00:00Z"
    }
  ]
}
```

#### FR-5.3: File Operations
- Create file on first add
- Read file before all operations
- Write file after modifications (add, remove, clear)
- Use atomic writes (write to temp, then rename)
- Format JSON with indentation (2 spaces)

#### FR-5.4: File Validation
- Validate JSON structure on read
- Handle corrupted files with clear error
- Offer to reset favorites if corrupted
- Backup existing file before destructive operations (optional)

## Output Formats

### Add Success
```
Added "JavaScript Jabber" to favorites
Feed URL: https://feeds.fireside.fm/javascriptjabber/rss
Feed ID: 920666
Total favorites: 3
```

### List Output
```
Your saved podcasts (3):

1. JavaScript Jabber
   Feed: https://feeds.fireside.fm/javascriptjabber/rss
   Added: Jan 10, 2024

2. Syntax - Tasty Web Development Treats
   Feed: https://feed.syntax.fm/rss
   Added: Jan 09, 2024

3. ShopTalk Show
   Feed: https://shoptalkshow.com/feed/podcast
   Added: Jan 08, 2024
```

### List Output (Empty)
```
No saved podcasts yet.

Add favorites with: pullapod favorite add <feed-url>
```

### Remove Confirmation
```
Remove "JavaScript Jabber"? (y/n):
```

### Remove Success
```
Removed "JavaScript Jabber" from favorites
Remaining favorites: 2
```

### Clear Confirmation
```
Remove all 3 favorites? This cannot be undone.
Type 'yes' to confirm:
```

### Clear Success
```
Removed 3 favorites
Favorites list is now empty
```

## Non-Functional Requirements

### NFR-1: Performance
- Add operation should complete within 3 seconds (API call)
- List operation should be instant (<100ms)
- Remove/clear operations should be instant (<100ms)
- File I/O should not block unnecessarily

### NFR-2: Error Handling
- Invalid feed URL: Clear error with format example
- Feed not found: Clear error suggesting search command
- Duplicate feed: Show existing entry, don't add again
- File permission errors: Clear error with troubleshooting
- Corrupted favorites file: Offer to reset
- API errors: Display clear message
- Network errors: Display clear message

### NFR-3: Data Integrity
- Use atomic file writes (no partial updates)
- Validate JSON structure before write
- Handle concurrent access gracefully (lock file or use atomic operations)
- Preserve existing data on write failures

### NFR-4: Usability
- All operations should provide clear feedback
- Confirmation prompts should be clear
- Error messages should suggest solutions
- Success messages should confirm action taken

### NFR-5: Portability
- Work on Linux, macOS, Windows
- Handle different path separators
- Respect XDG Base Directory Specification (Linux)
- Handle different home directory locations

## API Integration

### Podcast Index API Methods Used

**Add validation:**
```typescript
const result = await client.getPodcastByUrl(feedUrl);
// Extract: id, title, url (canonical)
```

## Dependencies

- Existing `PodcastIndexClient` class
- Podcast Index API credentials configured
- Commander.js for CLI argument parsing
- File system utilities (fs/promises)
- Path utilities
- JSON validation

## Edge Cases

1. **Feed URL redirects**: Use canonical URL from API response
2. **Feed URL variations**: Compare by feed ID, not URL string
3. **Feed name conflicts**: Allow duplicate names (different feeds)
4. **Corrupted JSON file**: Offer to reset, backup if possible
5. **Missing config directory**: Create automatically
6. **File permission errors**: Clear error with chmod suggestion
7. **Very long feed names**: Truncate in list view, show full on demand
8. **Special characters in names**: Handle properly in storage and display
9. **Empty name from API**: Fall back to URL or domain name
10. **Network timeout during add**: Display clear error, don't partially add

## Testing Requirements

### Unit Tests
- File path resolution (different OS)
- JSON serialization/deserialization
- Duplicate detection logic
- Name/URL matching for removal
- Confirmation prompt handling
- URL validation

### Integration Tests
- Add feed (with and without name)
- Add duplicate feed (should fail)
- List feeds (empty and populated)
- Remove feed by name
- Remove feed by URL
- Clear all feeds
- Handle corrupted favorites file
- API error during add
- File permission errors

### Manual Testing
- Test on different operating systems
- Test with actual podcast feeds
- Test file creation in new environment
- Test with corrupted JSON
- Test concurrent operations (multiple terminals)
- Verify atomic writes

## Future Enhancements

- Export favorites to file
- Import favorites from file
- Sync favorites across devices
- Add notes/tags to favorites
- Sort favorites by different criteria
- Search within favorites
- Bulk add from OPML file
- Show favorite statistics (last checked, episode count)
- Auto-remove dead feeds
- Folder/category organization

## Acceptance Criteria

- [ ] Add command validates and saves feeds correctly
- [ ] Add command prevents duplicates
- [ ] Add command auto-fetches podcast names
- [ ] List command displays all favorites correctly
- [ ] List command handles empty list gracefully
- [ ] Remove command works with name or URL
- [ ] Remove command requires confirmation
- [ ] Clear command removes all favorites with confirmation
- [ ] Favorites file stored in correct location
- [ ] JSON file is human-readable (formatted)
- [ ] File operations are atomic (no corruption)
- [ ] All error cases handled with clear messages
- [ ] Help text is clear for all subcommands
- [ ] Tests pass with >80% coverage
- [ ] Documentation updated
