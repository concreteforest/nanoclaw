# manage-feeds

## Purpose
Manage RSS feeds in ClaudeAggregator - add new sources, remove unwanted feeds, refresh content, and view feed catalog.

## Access Method
**HTTP REST API** running on `localhost:5000`

Endpoints:
- List feeds: `GET http://localhost:5000/api/feeds`
- Add feed: `POST http://localhost:5000/api/feeds`
- Remove feed: `DELETE http://localhost:5000/api/feeds/{feed_id}`
- Refresh feeds: `POST http://localhost:5000/api/feeds/refresh`

## Common Tasks

### Task 1: List All Feeds
**Default behavior:** Show all RSS feeds with categories and item counts
**Example queries:**
- "Show me all feeds"
- "What feeds are we tracking?"
- "List RSS sources"

**Access pattern:**
```bash
curl http://localhost:5000/api/feeds
```

**Telegram Output Format:**
```
📡 RSS Feeds:

*Technology* (3 feeds)
• TechCrunch - 45 items
• Hacker News - 32 items
• Ars Technica - 28 items

*Travel* (2 feeds)
• Nomadic Matt - 12 items
• The Points Guy - 18 items

(8 feeds total across 5 categories)
```

### Task 2: Add New RSS Feed
**Required:** Feed URL, Category (optional)
**Example queries:**
- "Add RSS feed https://example.com/rss to Technology"
- "Subscribe to this blog feed: https://blog.example.com/feed"

**Access pattern:**
```bash
curl -X POST http://localhost:5000/api/feeds \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/rss", "category": "Technology"}'
```

**Telegram Output Format:**
```
✅ Feed added successfully

*Example Blog*
Category: Technology
URL: https://example.com/rss
Items fetched: 15
```

### Task 3: Remove RSS Feed
**Required:** Feed ID or name
**Example queries:**
- "Remove TechCrunch feed"
- "Unsubscribe from Example Blog"
- "Delete feed ID 42"

**Access pattern:**
```bash
# First get feed ID from list
curl http://localhost:5000/api/feeds

# Then delete by ID
curl -X DELETE http://localhost:5000/api/feeds/42
```

**Telegram Output Format:**
```
🗑️ Feed removed

*Example Blog* has been unsubscribed
```

### Task 4: Refresh Feeds (Force Update)
**Purpose:** Manually trigger feed refresh instead of waiting for auto-update
**Example queries:**
- "Refresh all feeds"
- "Update RSS feeds now"
- "Check for new articles"

**Access pattern:**
```bash
curl -X POST http://localhost:5000/api/feeds/refresh
```

**Telegram Output Format:**
```
🔄 Refreshing all feeds...

Updated 8 feeds
Found 23 new articles
```

### Task 5: Refresh Specific Feed
**Purpose:** Update only one feed source
**Example queries:**
- "Refresh TechCrunch feed"
- "Update Hacker News"

**Access pattern:**
```bash
curl -X POST http://localhost:5000/api/feeds/{feed_id}/refresh
```

## Important Notes
- **Feed validation:** When adding feeds, the API will validate the URL and check if it's a valid RSS/Atom feed
- **Duplicates:** Adding an already-subscribed feed will return an error
- **Category auto-creation:** If a new category is specified, it will be created automatically
- **Refresh frequency:** Auto-refresh runs every 30 minutes (configurable)
- **Default category:** If no category specified when adding, defaults to "General"

## API Response Formats

**List feeds:**
```json
{
  "feeds": [
    {
      "id": 1,
      "name": "TechCrunch",
      "url": "https://techcrunch.com/feed",
      "category": "Technology",
      "item_count": 45,
      "last_updated": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Add feed success:**
```json
{
  "success": true,
  "feed": {
    "id": 9,
    "name": "Example Blog",
    "category": "Technology",
    "items_fetched": 15
  }
}
```

## Error Handling
- Invalid feed URL: "Not a valid RSS feed URL"
- Duplicate feed: "Feed already exists"
- Feed not found: "Feed ID not found"
- Network error: "Could not reach feed URL"
