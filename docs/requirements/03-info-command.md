# Feature Requirements: Info Command

## Overview

Enable users to view detailed information about a podcast feed before downloading episodes, including metadata, health status, and activity metrics.

## Feature ID
`FEAT-003`

## Priority
Medium - Supporting feature for informed decisions

## User Story

As a podcast listener, I want to view detailed information about a podcast feed so that I can verify it's the correct show and assess its quality before downloading episodes.

## Command Syntax

```bash
pullapod info <feed-url|feed-id>
```

### Arguments

- `<feed-url|feed-id>` (required) - RSS feed URL or Podcast Index feed ID

### Options

None required for initial implementation

### Examples

```bash
# Get info by feed URL
pullapod info https://feeds.fireside.fm/javascriptjabber/rss

# Get info by feed ID
pullapod info 920666
```

## Functional Requirements

### FR-1: Feed Resolution
- Accept both RSS feed URL and Podcast Index feed ID
- If feed URL provided: Query API with `getPodcastByUrl()`
- If numeric ID provided: Query API with `getPodcastById()`
- Auto-detect input type (numeric = ID, URL = feed URL)

### FR-2: Basic Information Display
Display core podcast metadata:
- **Title**: Full podcast title
- **Author**: Creator/host name
- **Language**: Full language name with code (e.g., "English (en)")
- **Episodes**: Total episode count
- **Feed ID**: Podcast Index feed ID
- **Feed URL**: RSS feed URL (canonical)
- **Website**: Podcast website/homepage link
- **Artwork**: Artwork image URL

### FR-3: Description Display
- Show full podcast description
- Strip HTML tags
- Format for readability (preserve paragraph breaks)
- Handle missing description gracefully

### FR-4: Category Display
- List all categories/subcategories
- Format as hierarchy (e.g., "Technology > Software Development")
- Handle multiple categories

### FR-5: Feed Health Status
Display feed status indicator:
- **Active**: Recent episodes (within 90 days)
- **Inactive**: No recent episodes (90+ days)
- **Dead**: Marked as dead by Podcast Index
- Visual indicator (✓ for active, ✗ for dead, ⚠ for inactive)

### FR-6: Activity Metrics
Show recent episode activity:
- Episodes in last 3 days
- Episodes in last 30 days
- Episodes in last 90 days
- Last update timestamp (relative format: "2 days ago")

### FR-7: Additional Metadata
- iTunes ID (if available)
- Explicit content flag
- Content type/medium (e.g., podcast, music, video)
- Last successful crawl time

### FR-8: User Guidance
- Include helpful message showing how to proceed
- Example: "Download episodes with: pullapod <feed-url> [options]"
- Suggest related commands (episodes, search)

## Output Format

```
Podcast Information:

Title:        JavaScript Jabber
Author:       Devchat.tv
Language:     English (en)
Episodes:     547 total
Feed ID:      920666
iTunes ID:    496893300
Feed URL:     https://feeds.fireside.fm/javascriptjabber/rss
Website:      https://javascriptjabber.com
Artwork:      https://cdn.fireside.fm/images/podcasts/artwork.jpg

Description:
Weekly panel discussion about JavaScript, front-end development, community,
careers, and frameworks. We cover topics like React, Vue, Angular, Node.js,
TypeScript, testing, and much more.

Categories:   Technology > Software Development
              Education > How To
Content:      Podcast (Clean)
Last Updated: Jan 15, 2024 (2 days ago)
Status:       Active ✓

Recent Activity:
- Last 3 days:   1 episode
- Last 30 days:  4 episodes
- Last 90 days: 13 episodes

---
Download episodes: pullapod <feed-url> --date YYYY-MM-DD
Preview episodes:  pullapod episodes <feed-url>
```

## Non-Functional Requirements

### NFR-1: Performance
- Info requests should complete within 5 seconds under normal conditions
- Display results as soon as received

### NFR-2: Error Handling
- Invalid feed URL: Display clear error message
- Invalid feed ID: Display "Feed not found" error
- Dead/defunct feeds: Display with clear indication of status
- Network errors: Display clear message with retry suggestion
- API errors: Display error message from Podcast Index API
- Missing optional fields: Handle gracefully (show "N/A" or omit)

### NFR-3: API Configuration
- Require Podcast Index API credentials
- Display helpful error if credentials missing

### NFR-4: Output Quality
- Format URLs to be copy-pasteable
- Align labels consistently (left-aligned labels, values after)
- Handle very long titles/descriptions appropriately
- Use consistent date formatting
- Handle special characters correctly

### NFR-5: Language Display
- Convert language codes to full names where possible
- Fall back to code if name unknown
- Format as "English (en)" for clarity

## API Integration

### Podcast Index API Methods Used

**For feed URL:**
```typescript
const result = await client.getPodcastByUrl(feedUrl);
```

**For feed ID:**
```typescript
const result = await client.getPodcastById(feedId);
```

### Response Data Used
From `PodcastFeed` interface:
- `title` - Podcast title
- `author` or `ownerName` - Creator name
- `language` - Language code
- `episodeCount` - Total episodes
- `id` - Feed ID
- `url` - RSS feed URL
- `link` - Website URL
- `artwork` or `image` - Artwork URL
- `description` - Full description
- `categories` - Category mapping
- `itunesId` - iTunes ID (optional)
- `explicit` - Explicit flag
- `medium` - Content type
- `lastUpdateTime` - Last update timestamp
- `lastCrawlTime` - Last crawl timestamp
- `dead` - Dead feed flag
- `crawlErrors` - Error count
- `parseErrors` - Parse error count

### Activity Calculation
Calculate recent activity by comparing `lastUpdateTime` with:
- 3 days ago: Episodes within 3 days
- 30 days ago: Episodes within 30 days
- 90 days ago: Episodes within 90 days

Note: Initial implementation will show last update time. Full activity metrics require additional API call to `getEpisodesByFeedId()` with `since` parameter.

## Dependencies

- Existing `PodcastIndexClient` class
- Podcast Index API credentials configured
- Commander.js for CLI argument parsing
- Date formatting utilities
- Language code to name mapping (optional)
- HTML stripping utility

## Edge Cases

1. **Feed doesn't exist**: Display "Feed not found" error
2. **Dead feed**: Display clearly with warning symbol
3. **Missing optional fields**: Show "N/A" or omit field
4. **No categories**: Display "Uncategorized" or omit section
5. **Very long descriptions**: Allow wrapping but maintain readability
6. **No artwork**: Show "No artwork available"
7. **No website link**: Omit or show "N/A"
8. **Invalid/expired SSL on feed URL**: Note in status but display info
9. **Feed URL vs Feed ID ambiguity**: Prefer feed ID if input is purely numeric

## Testing Requirements

### Unit Tests
- Feed URL vs ID detection
- Language code formatting
- Date/time relative formatting
- Category hierarchy formatting
- Status determination logic
- HTML stripping from descriptions

### Integration Tests
- Query by feed URL
- Query by feed ID
- Handle active feeds
- Handle inactive feeds
- Handle dead feeds
- Handle feeds with missing optional data
- API error handling

### Manual Testing
- Test with various known feeds
- Test with dead/inactive feeds
- Test with missing artwork
- Test with no categories
- Test with very long descriptions
- Verify URLs work with other commands

## Future Enhancements

- Add `--format json` for programmatic use
- Show RSS feed format version
- Display feed generator software
- Show average episode length
- Display publishing frequency
- Show feed update reliability score
- Add `--history` to show episode timeline
- Fetch and display latest episode info
- Show subscriber counts (if available)

## Acceptance Criteria

- [ ] Command accepts feed URL or feed ID
- [ ] All specified information displays correctly
- [ ] Feed status accurately reflects health
- [ ] Formatting is clean and readable
- [ ] Missing optional fields handled gracefully
- [ ] Dead/inactive feeds clearly indicated
- [ ] Error handling covers all specified cases
- [ ] Help text is clear and accurate
- [ ] Tests pass with >80% coverage
- [ ] Documentation updated
