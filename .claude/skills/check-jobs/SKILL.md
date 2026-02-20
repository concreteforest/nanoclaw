# check-jobs

## Purpose
Query and review job listings from job-scout scoring engine. Understand the business logic of job tiers and retrieve relevant opportunities based on scoring.

## Access Method
**Direct Filesystem Access** to scored job JSON files

Primary location: `/workspace/extra/job-scout/data/jobs/scored/*.json`

Each file contains a scored job with metadata, scoring breakdown, and flags.

## Business Logic - Job Scoring Tiers

**CRITICAL:** Understand these scoring tiers - they represent job-scout's core business logic:

| Tier | Score Range | Meaning | User Intent |
|------|-------------|---------|-------------|
| **High-Scoring** | 85-100 | Top matches, immediate action | "Show high-scoring jobs" |
| **Candidates** | 70-84 | Worth reviewing, potential | "Show candidate jobs" |
| **Low-Scoring** | 0-69 | Poor fit, usually filtered | "Show all jobs" (rare) |

**Default behavior:** When user asks generically ("check jobs", "any new jobs"), understand context:
- If they're actively job hunting: Show high-scoring (85+)
- If they want a comprehensive view: Show both high-scoring AND candidates
- Never default to showing low-scoring jobs (<70) unless explicitly requested

## Common Tasks

### Task 1: Get High-Scoring Jobs (85+)
**Default behavior:** Top 5 high-scoring jobs by score (descending)
**Example queries:**
- "Show high-scoring jobs"
- "What are my top job matches?"
- "Any great jobs today?"

**Access pattern:**
```bash
cd /workspace/extra/job-scout/data/jobs/scored
# Find JSON files with score >= 85, sort by score descending, limit 5
for file in *.json; do
  score=$(jq -r '.score' "$file")
  if [ "$score" -ge 85 ]; then
    # Process this job
  fi
done
```

**Telegram Output Format:**
```
⭐ High-Scoring Jobs (85+):

87 pts | *Senior Product Designer*
Adobe • Remote • $150-170K
🎯 Priority company • Strong title match
https://adobe.careers/job/12345

85 pts | *Design Lead*
Shopify • Toronto, ON • $140-160K
🎯 Priority company
https://shopify.careers/job/67890

(2 high-scoring jobs found. Say "show candidates" for 70-84 range)
```

### Task 2: Get Candidate Jobs (70-84)
**Purpose:** Review jobs that are worth considering but not perfect matches
**Example queries:**
- "Show candidate jobs"
- "What's in the 70-84 range?"
- "Show jobs worth reviewing"

**Access pattern:**
```bash
# Find JSON files with 70 <= score < 85
for file in *.json; do
  score=$(jq -r '.score' "$file")
  if [ "$score" -ge 70 ] && [ "$score" -lt 85 ]; then
    # Process this job
  fi
done
```

**Telegram Output Format:**
```
💡 Candidate Jobs (70-84):

78 pts | *UX Designer*
Meta • Menlo Park, CA • $130-150K
⚠️ Onsite required
https://meta.careers/job/...

72 pts | *Product Designer*
Airbnb • San Francisco • $120-140K
https://airbnb.careers/job/...

(2 candidate jobs. These are worth reviewing but not top matches)
```

### Task 3: Search by Company or Title
**Purpose:** Find specific jobs regardless of score
**Example queries:**
- "Any jobs at Google?"
- "Show Adobe positions"
- "Find senior designer roles"

**Access pattern:**
```bash
# Search JSON files where company or title matches query
jq -r 'select(.company | test("Google"; "i")) | .' *.json
```

**Telegram Output Format:**
Include score tier context:
```
🔍 Jobs at Google:

92 pts | *Senior UX Designer* (High-scoring)
Google • Remote • $160-180K
https://...

68 pts | *Product Designer* (Below candidate threshold)
Google • Mountain View • $130-150K
https://...
```

### Task 4: Show Scoring Breakdown
**Purpose:** Understand why a job scored the way it did
**Example queries:**
- "Why did the Adobe job score 87?"
- "Show scoring details for that Shopify position"

**Access pattern:**
```bash
# Read specific job JSON and extract scoring breakdown
jq '{
  score,
  flags,
  salary_match,
  title_match,
  location_match,
  remote_preference,
  priority_company
}' job-12345.json
```

**Telegram Output Format:**
```
📊 Scoring Breakdown - Adobe Senior Product Designer (87 pts)

Base score: 75
🎯 Priority company: +10
💪 Strong title match: +5
💰 Salary above expectations: +3
🏠 Remote available: +2
📍 Preferred location: +2

Total: 87 pts

Flags: priority_company, remote, senior_level
```

### Task 5: Get All Jobs (Including Low-Scoring)
**Purpose:** Comprehensive view of all scraped jobs
**Example queries:**
- "Show all jobs"
- "How many total jobs do we have?"

**Access pattern:**
```bash
# List all JSON files
ls -1 /workspace/extra/job-scout/data/jobs/scored/*.json | wc -l
```

**Telegram Output Format:**
```
📊 All Jobs Summary:

High-scoring (85+): 2 jobs
Candidates (70-84): 5 jobs
Low-scoring (<70): 12 jobs

Total: 19 jobs

(Showing top 5 overall. Specify tier for filtered view)
```

## Important Notes

### Business Logic Preservation
- **85+ = High-scoring**: These are the "alert-worthy" jobs
- **70-84 = Candidates**: Worth manual review but not urgent
- **<70 = Filtered**: Usually not shown unless explicitly requested
- **Tier context**: Always include tier information so user understands quality

### Message Length Management
- **Default limit**: 5 jobs per query
- **Progressive disclosure**: Always offer to show more or switch tiers
- **Scoring flags**: Include key flags (🎯 priority, 🏠 remote, ⚠️ onsite, 💰 high salary)

### Markdown Formatting
- Use `*bold*` for job titles
- Plain URLs for links
- Emojis for flags (sparingly, only meaningful ones)
- Score + pts format: "87 pts"

## JSON File Structure
```json
{
  "id": "job-12345",
  "title": "Senior Product Designer",
  "company": "Adobe",
  "location": "Remote",
  "salary": "$150-170K",
  "url": "https://adobe.careers/job/12345",
  "score": 87,
  "flags": ["priority_company", "remote", "senior_level"],
  "scoring_breakdown": {
    "base": 75,
    "priority_company": 10,
    "title_match": 5,
    "salary_bonus": 3,
    "remote_bonus": 2,
    "location_bonus": 2
  },
  "posted_date": "2024-01-15",
  "scraped_at": "2024-01-15T10:30:00Z"
}
```

## Error Handling
- No jobs found: "No jobs found in that tier. Try 'show all jobs' for full view"
- Invalid tier: Clarify tiers available
- File access error: "Could not access job-scout data directory"
- Empty directory: "No scored jobs yet. Job-scout may need to run"

## Integration Notes
When user says "check jobs" without specifying tier:
1. Assume they want high-scoring (85+) by default
2. If zero high-scoring, automatically show candidates (70-84)
3. Always mention how many jobs exist in other tiers
4. Offer to show other tiers if current tier is empty
