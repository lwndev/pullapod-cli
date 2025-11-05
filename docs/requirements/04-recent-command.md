# Feature Requirements: Recent Command

## Overview

Enable users to check recent episodes from their saved/favorite podcasts without checking each feed individually.

## Feature ID
`FEAT-004`

## Priority
Medium - Convenience feature for regular users

## User Story

As a podcast listener who regularly checks specific podcasts, I want to see recent episodes from my saved feeds so that I can quickly identify new content to download.

## Command Syntax

```bash
pullapod recent [options]
```

### Arguments

None - operates on saved favorites list

### Options

- `--max <number>` - Max episodes per feed (default: 5, range: 1-20)
- `--days <number>` - Only episodes from last N days (default: 7, range: 1-90)
- `--feed <name>` - Show recent episodes from specific saved feed only

### Examples

```bash
# Show recent episodes from all saved feeds (last 7 days)
pullapod recent

# Show up to 10 episodes per feed
pullapod recent --max 10

# Show episodes from last 14 days
pullapod recent --days 14

# Show recent episodes from specific saved feed
pullapod recent --feed "JavaScript Jabber"

# Combine options
pullapod recent --feed "Syntax" --max 3 --days 3
```

## Functional Requirements

### FR-1: Favorites Dependency
- Require favorites list to be configured (see FEAT-005)
- Display helpful error if no favorites saved
- Error message should guide user to add favorites
- Exit gracefully with exit code 1 if no favorites

### FR-2: Episode Fetching
- For each saved feed, fetch recent episodes via Podcast Index API
- Use `getEpisodesByFeedId()` with `since` parameter
- Calculate `since` timestamp based on `--days` option
- Fetch up to `--max` episodes per feed

### FR-3: Filtering
- Filter episodes to only those published within specified days
- If `--feed` option provided, only show that specific feed
- Match feed by name (case-insensitive, partial match acceptable)

### FR-4: Display Format
- Group episodes by podcast
- Show podcast name as section header
- Display episode count per podcast
- List episodes in compact format (one line per episode)
- Sort podcasts by most recent episode first
- Within each podcast, sort episodes newest first

### FR-5: Episode Information
Display per episode:
- Episode title
- Publish date (relative or short format: "Jan 15" or "2 days ago")

### FR-6: Summary
- Show total episode count across all podcasts
- Show number of podcasts with new episodes
- Display at bottom of output

### FR-7: No New Episodes Handling
- Display message if no new episodes found
- Differentiate between "no episodes in timeframe" vs "no favorites configured"
- Exit gracefully with exit code 0

### FR-8: User Guidance
- Include helpful message about downloading episodes
- Suggest related commands (favorite, episodes)

## Output Format

```
Recent episodes from your saved podcasts (last 7 days):

JavaScript Jabber (3 new episodes)
  • JSJ 547: Modern React Patterns (Jan 15, 2024)
  • JSJ 546: TypeScript 5.0 Deep Dive (Jan 14, 2024)
  • JSJ 545: Web Performance Tips (Jan 13, 2024)

Syntax - Tasty Web Development Treats (2 new episodes)
  • Supper Club: Scott's Home Office Setup (Jan 16, 2024)
  • Hasty Treat: CSS Container Queries (Jan 14, 2024)

ShopTalk Show (1 new episode)
  • Episode 598: Potluck Questions (Jan 12, 2024)

---
Total: 6 new episodes across 3 podcasts
Download with: pullapod <feed-url> --date YYYY-MM-DD
```

### Output Format (No New Episodes)

```
No new episodes from your saved podcasts in the last 7 days.

Try: pullapod recent --days 30
```

### Output Format (No Favorites)

```
No saved podcasts found.

Add favorites with: pullapod favorite add <feed-url>
List favorites with: pullapod favorite list
```

### Output Format (Specific Feed)

```
Recent episodes from "JavaScript Jabber" (last 7 days):

  • JSJ 547: Modern React Patterns (Jan 15, 2024)
  • JSJ 546: TypeScript 5.0 Deep Dive (Jan 14, 2024)
  • JSJ 545: Web Performance Tips (Jan 13, 2024)

---
3 new episodes
Download with: pullapod <feed-url> --date YYYY-MM-DD
```

## Non-Functional Requirements

### NFR-1: Performance
- Fetch episodes from multiple feeds in parallel
- Complete within 10 seconds for up to 10 feeds
- Display results as they arrive (progressive output)
- Consider rate limiting when fetching many feeds

### NFR-2: Error Handling
- Handle individual feed failures gracefully (skip and continue)
- Display warning for feeds that fail to fetch
- Network errors: Continue with other feeds, note failures
- API errors: Skip failed feed, show warning
- Invalid feed in favorites: Skip and warn user
- Rate limiting: Display clear message

### NFR-3: Favorites File Access
- Read favorites from configured location
- Handle missing favorites file gracefully
- Handle corrupted favorites file with clear error

### NFR-4: Output Quality
- Keep output compact (one line per episode)
- Format dates consistently
- Group clearly by podcast
- Use visual separators (bullets, sections)
- Truncate very long episode titles

### NFR-5: Resource Usage
- Limit concurrent API requests (max 5 at a time)
- Respect API rate limits
- Cache results briefly (optional enhancement)

## API Integration

### Podcast Index API Methods Used

**Fetch recent episodes per feed:**
```typescript
const sinceTimestamp = Math.floor(Date.now() / 1000) - (days * 86400);

for (const favorite of favorites) {
  const result = await client.getEpisodesByFeedId({
    id: favorite.feedId,
    max: maxEpisodes,
    since: sinceTimestamp,
  });
  // Process episodes
}
```

### Response Data Used
From `PodcastEpisode` interface:
- `title` - Episode title
- `datePublished` - Publish timestamp
- `feedTitle` - Podcast title (for verification)
- `feedId` - Feed ID (for matching)

### Favorites File Structure
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

## Dependencies

- Existing `PodcastIndexClient` class
- Favorites file system (from FEAT-005)
- Podcast Index API credentials configured
- Commander.js for CLI argument parsing
- Date/time utilities
- File system utilities for reading favorites

## Edge Cases

1. **No favorites configured**: Display helpful error with instructions
2. **Empty favorites list**: Same as no favorites
3. **All feeds fail to fetch**: Display error, suggest checking connection
4. **Some feeds fail**: Skip failed feeds, show results for successful ones
5. **Feed name doesn't match**: Display error, list available feed names
6. **No episodes in timeframe**: Display "no new episodes" message
7. **Very large favorites list**: Warn if >20 feeds, suggest --feed filter
8. **Deleted/dead feeds in favorites**: Skip with warning
9. **Favorite feed ID changed**: Handle API error gracefully
10. **Zero days specified**: Treat as error, require minimum 1 day

## Testing Requirements

### Unit Tests
- Days to timestamp conversion
- Episode filtering by date
- Feed name matching logic
- Output formatting
- Summary calculation

### Integration Tests
- Fetch from single favorite feed
- Fetch from multiple favorite feeds
- Handle missing favorites file
- Handle feed fetch failures
- Filter by specific feed name
- Date range filtering
- Max episodes limiting

### Manual Testing
- Test with no favorites
- Test with one favorite
- Test with multiple favorites
- Test with --feed filter
- Test with various --days values
- Test with network issues
- Verify dates display correctly
- Test with dead/removed feeds in favorites

## Future Enhancements

- Add `--format json` for programmatic use
- Cache episode data to reduce API calls
- Show episode duration
- Add `--download-new` to auto-download new episodes
- Email/notification support for new episodes
- Show which episodes were already downloaded
- Interactive mode to select episodes to download
- Group by publish date instead of podcast
- Show episode descriptions (with --verbose)

## Acceptance Criteria

- [ ] Command works without arguments (uses defaults)
- [ ] All options work as specified
- [ ] Output format is clear and compact
- [ ] Favorites dependency handled properly
- [ ] Multiple feeds fetched correctly
- [ ] Date filtering works accurately
- [ ] Feed name filtering works (--feed)
- [ ] No new episodes handled gracefully
- [ ] Feed fetch failures handled gracefully
- [ ] Error messages are helpful
- [ ] Help text is clear and accurate
- [ ] Tests pass with >80% coverage
- [ ] Documentation updated
