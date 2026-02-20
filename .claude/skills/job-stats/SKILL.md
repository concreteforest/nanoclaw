# job-stats

## Purpose
View aggregate statistics and trends from job-scout data - job counts by tier, salary ranges, top companies, and temporal trends.

## Access Method
**Direct Filesystem Access** to scored job JSON files

Primary location: `/workspace/extra/job-scout/data/jobs/scored/*.json`

Aggregate data from all JSON files to produce statistics.

## Common Tasks

### Task 1: Count Jobs by Tier
**Default behavior:** Show distribution across scoring tiers
**Example queries:**
- "How many jobs do we have?"
- "Show job stats"
- "What's the job breakdown?"

**Access pattern:**
```bash
cd /workspace/extra/job-scout/data/jobs/scored
# Count jobs by score range
jq -r '.score' *.json | awk '
  $1 >= 85 { high++ }
  $1 >= 70 && $1 < 85 { candidate++ }
  $1 < 70 { low++ }
  END {
    print "High-scoring (85+):", high
    print "Candidates (70-84):", candidate
    print "Low-scoring (<70):", low
    print "Total:", high + candidate + low
  }'
```

**Telegram Output Format:**
```
📊 Job Statistics:

⭐ High-scoring (85+): 2 jobs
💡 Candidates (70-84): 5 jobs
📉 Low-scoring (<70): 12 jobs

*Total: 19 jobs*
Average score: 68 pts
```

### Task 2: Salary Range Analysis
**Purpose:** Understand salary distribution across all jobs
**Example queries:**
- "What are the salary ranges?"
- "Show me salary stats"
- "What's the pay like?"

**Access pattern:**
```bash
# Extract salary ranges and compute min/max/avg
jq -r '.salary' *.json | # Parse salary strings like "$150-170K"
```

**Telegram Output Format:**
```
💰 Salary Analysis:

Highest: $180K
Median: $145K
Lowest: $95K

By tier:
⭐ High-scoring avg: $160K
💡 Candidates avg: $135K
📉 Low-scoring avg: $110K
```

### Task 3: Top Companies
**Purpose:** See which companies have the most listings
**Example queries:**
- "Which companies are hiring most?"
- "Top companies in my job feed"

**Access pattern:**
```bash
# Count jobs per company, sort descending
jq -r '.company' *.json | sort | uniq -c | sort -rn | head -5
```

**Telegram Output Format:**
```
🏢 Top Companies (by job count):

1. Google - 5 jobs (avg score: 72)
2. Adobe - 3 jobs (avg score: 88)
3. Meta - 2 jobs (avg score: 65)
4. Shopify - 2 jobs (avg score: 81)
5. Airbnb - 1 job (avg score: 72)
```

### Task 4: Recent Job Trends
**Purpose:** Track new jobs over time (weekly/monthly)
**Example queries:**
- "How many jobs this week?"
- "Show monthly job trends"
- "Any increase in postings?"

**Access pattern:**
```bash
# Group by posted_date or scraped_at
jq -r '.scraped_at' *.json | awk -F'T' '{print $1}' | sort | uniq -c
```

**Telegram Output Format:**
```
📈 Job Trends (Last 7 Days):

Mon Jan 15: 3 jobs
Tue Jan 16: 5 jobs
Wed Jan 17: 2 jobs
Thu Jan 18: 4 jobs
Fri Jan 19: 0 jobs

Total this week: 14 jobs
```

### Task 5: Flag Analysis
**Purpose:** See which flags appear most frequently
**Example queries:**
- "What job flags are common?"
- "How many remote jobs?"
- "Show priority company count"

**Access pattern:**
```bash
# Extract and count flags
jq -r '.flags[]' *.json | sort | uniq -c | sort -rn
```

**Telegram Output Format:**
```
🏷️ Common Job Flags:

🎯 priority_company: 8 jobs
🏠 remote: 12 jobs
💼 senior_level: 6 jobs
⚠️ onsite_required: 4 jobs
💰 high_salary: 5 jobs
```

## Important Notes

### Statistics Scope
- Always specify the time range when showing trends (e.g., "last 7 days", "this month")
- Job counts should match tier breakdown from `check-jobs`
- Salary stats should handle various formats: "$150K", "$150-170K", "$150,000"

### Message Formatting
- Keep stats concise - use tables/lists
- Bold important numbers
- Use emojis for visual grouping
- Always include totals/context

### Accuracy
- Handle edge cases: no jobs, missing salary data, malformed JSON
- Round averages to nearest K for salaries
- Sort descending for "top" lists

## Data Aggregation Tips

**Parse salary strings:**
```bash
# Convert "$150-170K" to average: 160
echo "$150-170K" | sed 's/[^0-9-]//g' | awk -F'-' '{print ($1 + $2) / 2}'
```

**Group by date:**
```bash
# Extract YYYY-MM-DD from ISO timestamp
jq -r '.scraped_at' | cut -d'T' -f1
```

**Count unique values:**
```bash
# Companies, flags, locations, etc.
jq -r '.company' *.json | sort | uniq -c | sort -rn
```

## Error Handling
- No jobs found: "No job data available yet"
- Missing fields: "Some jobs missing salary data - stats may be incomplete"
- Invalid JSON: "Some job files are corrupted, showing partial stats"
- Empty directory: "No scored jobs yet. Run job-scout to populate data"

## Integration with check-jobs
When showing stats, offer actionable follow-ups:
- "2 high-scoring jobs" → "Say 'check jobs' to see them"
- "8 jobs at Google" → "Say 'show Google jobs' to view"
- "12 remote jobs" → "Want to see the remote positions?"
