# Cost Tracking System

## Overview

NanoClaw now includes a comprehensive cost tracking system that monitors API token usage and calculates costs based on LiteLLM pricing.

## Features

- **Automatic Cost Calculation**: Costs are calculated based on current LiteLLM pricing for Claude models
- **Historical Tracking**: All token usage is stored in SQLite database with timestamps
- **Flexible Reporting**: View costs by date range, group, or model
- **Daily Breakdowns**: Track spending trends over time

## Pricing (as of 2026-02-18)

Based on https://models.litellm.ai/:

| Token Type | Cost per Million |
|------------|------------------|
| Input | $3.00 |
| Output | $15.00 |
| Cache Write | $3.75 |
| Cache Read | $0.30 |

## Usage

### Query Cost Summary

Ask Andy questions like:
- "What are my costs today?"
- "Show me usage for the last 30 days"
- "How much have I spent this month?"
- "What's the cost breakdown by group?"

### Available MCP Tools

1. **get_cost_summary** - Get overall costs with breakdowns
   ```typescript
   Parameters:
   - start_date?: string (ISO format)
   - end_date?: string (ISO format)
   - group_folder?: string
   ```

2. **get_daily_costs** - Daily cost breakdown
   ```typescript
   Parameters:
   - days?: number (default: 30)
   ```

3. **log_token_usage** - Manual token logging
   ```typescript
   Parameters:
   - model: string
   - input_tokens: number
   - output_tokens: number
   - cache_write_tokens?: number
   - cache_read_tokens?: number
   ```

## Example Output

```
*Cost Summary*

Total Cost: $0.1128
Total Requests: 1
Period: 2026-02-18T18:54:15.898Z to 2026-02-18T18:54:15.898Z

*Token Usage:*
• Input: 10,000 tokens
• Output: 5,000 tokens
• Cache Write: 2,000 tokens
• Cache Read: 1,000 tokens

*By Group:*
• main: $0.1128 (1 requests)

*By Model:*
• claude-3-5-sonnet-latest: $0.1128 (1 requests)
```

## Database Schema

The system creates a `token_usage` table in `store/messages.db`:

```sql
CREATE TABLE token_usage (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  group_folder TEXT NOT NULL,
  chat_jid TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cache_write_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  input_cost REAL NOT NULL,
  output_cost REAL NOT NULL,
  cache_write_cost REAL DEFAULT 0,
  cache_read_cost REAL DEFAULT 0,
  total_cost REAL NOT NULL,
  message_id TEXT
);
```

## Updating Pricing

To update pricing when LiteLLM rates change:

1. Edit `src/cost-tracker.ts`
2. Update the `MODEL_PRICING` object with new rates
3. Rebuild: `npm run build`
4. Restart the service

## Implementation Details

- **Cost Tracker Module**: `src/cost-tracker.ts` - Core tracking logic
- **MCP Server**: `container/agent-runner/src/ipc-mcp-stdio.ts` - Tool definitions
- **IPC Handler**: `src/ipc.ts` - Processes cost tracking requests
- **Database**: SQLite table in `store/messages.db`

## Future Enhancements

Potential improvements:
- Automatic capture of token usage from SDK responses
- Budget alerts when costs exceed thresholds
- Cost projections based on usage trends
- Export reports to CSV/JSON
- Scheduled daily/weekly cost summaries
