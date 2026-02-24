# fetch-news

## Purpose
Retrieve latest articles from ClaudeAggregator RSS feed aggregator. Get recent news from tech, business, and other sources in a Telegram-friendly format.

## Access Method
**HTTP REST API** running on `localhost:5000`

Primary endpoint: `GET http://localhost:5000/api/articles/jarvis`

This endpoint returns JSON with articles already formatted for agent consumption.

## Common Tasks

### Task 1: Get Latest Articles (Default)
**Default behavior:** Last 5 articles from the past 24 hours
**Options:** Filter by category, exclude specific feeds, adjust time range
**Example queries:**
- "Get latest news"
- "Show me today's articles"
- "What's new in tech?"

**Access pattern:**
```bash
curl http://localhost:5000/api/articles/jarvis?limit=5&hours=24
```

**Telegram Output Format:**
```
📰 Latest News (last 24h):

*Article Title Here*
TechCrunch • 2h ago
https://example.com/article

*Another Article Title*
Hacker News • 5h ago
https://example.com/article2

(5 articles shown. Ask for more or filter by category)
```

### Task 2: Filter by Category
**Options:** Technology, Travel, Business, Science, etc.
**Example queries:**
- "Show tech news"
- "Get travel articles"
- "What's new in science?"

**Access pattern:**
```bash
curl http://localhost:5000/api/articles/jarvis?category=Technology&limit=5
```

**Telegram Output Format:**
Same as Task 1 but with category in header:
```
📰 Technology News (last 24h):
...
```

### Task 3: Exclude Specific Feeds
**Purpose:** Filter out deals, flyers, or unwanted sources
**Example queries:**
- "Get news but skip deals"
- "Show articles without flyers"

**Access pattern:**
```bash
curl http://localhost:5000/api/articles/jarvis?exclude_feeds=deals,flyers&limit=5
```

### Task 4: Extended Time Range
**Options:** Last 48 hours, last week, etc.
**Example queries:**
- "Show me articles from the past week"
- "Get news from last 48 hours"

**Access pattern:**
```bash
curl http://localhost:5000/api/articles/jarvis?hours=168&limit=5
```

## Important Notes
- **Message length limits:** Default to 5 articles to prevent spam
- **Progressive disclosure:** Always offer to show more ("Ask for more" footer)
- **Markdown formatting:** Use `*bold*` for titles, plain URLs for links
- **Time display:** Show relative time (e.g., "2h ago" instead of timestamp)
- **One-line summaries:** Title, source, and age on separate lines for readability

## API Response Format
The `/api/articles/jarvis` endpoint returns:
```json
{
  "articles": [
    {
      "title": "Article Title",
      "link": "https://...",
      "source": "TechCrunch",
      "category": "Technology",
      "pub_date": "2024-01-15T10:30:00Z",
      "description": "Article summary..."
    }
  ]
}
```

Transform this into the Telegram format above, calculating relative time from `pub_date`.

## Error Handling
- If API is unreachable: "ClaudeAggregator service is not running"
- If no articles found: "No articles found for that criteria"
- If invalid category: "Category not found. Available: Technology, Travel, Business..."
