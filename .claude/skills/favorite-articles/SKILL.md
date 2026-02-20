# favorite-articles

## Purpose
Save important articles to favorites in ClaudeAggregator for later reference. Organize, retrieve, and manage your saved article collection.

## Access Method
**HTTP REST API** running on `localhost:5000`

Endpoints:
- List favorites: `GET http://localhost:5000/api/favorites`
- Add to favorites: `POST http://localhost:5000/api/favorites`
- Remove from favorites: `DELETE http://localhost:5000/api/favorites/{article_id}`
- Filter by category: `GET http://localhost:5000/api/favorites?category=Technology`

## Common Tasks

### Task 1: View All Favorites
**Default behavior:** Show last 5 favorited articles
**Example queries:**
- "Show my favorite articles"
- "What articles have I saved?"
- "List my favorites"

**Access pattern:**
```bash
curl http://localhost:5000/api/favorites?limit=5
```

**Telegram Output Format:**
```
⭐ Favorite Articles:

*Article Title Here*
TechCrunch • Technology • Saved 2d ago
https://example.com/article

*Another Saved Article*
Hacker News • Business • Saved 1w ago
https://example.com/article2

(5 favorites shown. Say "show all favorites" for more)
```

### Task 2: Add Article to Favorites
**Required:** Article URL or ID
**Example queries:**
- "Save this article to favorites"
- "Add to favorites: https://example.com/article"
- "Favorite the TechCrunch article from today"

**Access pattern:**
```bash
# If you have article ID from recent fetch-news
curl -X POST http://localhost:5000/api/favorites \
  -H "Content-Type: application/json" \
  -d '{"article_id": 42}'

# Or by URL
curl -X POST http://localhost:5000/api/favorites \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

**Telegram Output Format:**
```
⭐ Added to favorites

*Article Title*
TechCrunch • Technology
https://example.com/article
```

### Task 3: Remove from Favorites
**Required:** Article ID or URL
**Example queries:**
- "Remove this from favorites"
- "Unfavorite the article about AI"
- "Delete favorite ID 42"

**Access pattern:**
```bash
curl -X DELETE http://localhost:5000/api/favorites/42
```

**Telegram Output Format:**
```
🗑️ Removed from favorites

*Article Title* has been removed
```

### Task 4: Filter Favorites by Category
**Options:** Technology, Travel, Business, etc.
**Example queries:**
- "Show my favorite tech articles"
- "Get my saved travel articles"

**Access pattern:**
```bash
curl http://localhost:5000/api/favorites?category=Technology&limit=5
```

**Telegram Output Format:**
```
⭐ Technology Favorites:

*Article 1*
TechCrunch • Saved 2d ago
https://...

*Article 2*
Ars Technica • Saved 1w ago
https://...

(3 Technology favorites)
```

### Task 5: Search Favorites
**Purpose:** Find saved articles by keyword
**Example queries:**
- "Search my favorites for 'AI'"
- "Find saved articles about 'machine learning'"

**Access pattern:**
```bash
curl http://localhost:5000/api/favorites?search=AI&limit=5
```

## Important Notes
- **Message length limits:** Default to 5 favorites, offer to show more
- **Progressive disclosure:** Always include count and "show all" option
- **Markdown formatting:** Use `*bold*` for titles, plain URLs
- **Time display:** Show when article was saved (relative time)
- **Duplicate prevention:** Can't favorite the same article twice
- **Context awareness:** When user says "save this", look at recent fetch-news results to identify article

## API Response Format

**List favorites:**
```json
{
  "favorites": [
    {
      "id": 1,
      "article_id": 42,
      "title": "Article Title",
      "url": "https://...",
      "source": "TechCrunch",
      "category": "Technology",
      "saved_at": "2024-01-13T10:30:00Z"
    }
  ],
  "total": 15
}
```

**Add to favorites:**
```json
{
  "success": true,
  "favorite": {
    "id": 16,
    "title": "Article Title",
    "saved_at": "2024-01-15T14:20:00Z"
  }
}
```

## Error Handling
- Article not found: "Could not find that article"
- Already favorited: "This article is already in your favorites"
- Invalid ID: "Article ID not found"
- Empty favorites: "No favorites saved yet. Try 'fetch-news' and 'save this article'"

## Integration with fetch-news
When a user reads articles via `fetch-news` and then says "save this" or "favorite the second one":
1. Reference the most recent fetch-news results
2. Identify which article they're referring to (by position, title keyword, or context)
3. Use that article's ID to add to favorites
4. Confirm which article was saved
