# adjust-scoring

## Purpose
Modify job-scout scoring criteria - adjust alert threshold, salary expectations, priority companies, location preferences, and other scoring parameters.

## Access Method
**Direct File Edit** of job-scout configuration file

Primary location: `/workspace/extra/job-scout/config/scoring.json`

Modify the configuration and optionally trigger re-scoring of existing jobs.

## Common Tasks

### Task 1: View Current Scoring Config
**Default behavior:** Show all scoring parameters
**Example queries:**
- "Show scoring settings"
- "What's my current job config?"
- "Display scoring criteria"

**Access pattern:**
```bash
cat /workspace/extra/job-scout/config/scoring.json | jq .
```

**Telegram Output Format:**
```
⚙️ Current Scoring Config:

*Thresholds:*
Alert threshold: 85 pts
Candidate threshold: 70 pts

*Salary Expectations:*
Minimum: $120K
Target: $150K
Ideal: $180K

*Priority Companies:*
Adobe, Shopify, Figma, Stripe, Notion

*Location Preferences:*
Remote (preferred)
Toronto, ON
San Francisco, CA
```

### Task 2: Adjust Alert Threshold
**Purpose:** Change the minimum score for "high-scoring" job alerts
**Example queries:**
- "Set alert threshold to 90"
- "Lower alert threshold to 80"
- "I want to be notified at 82 points"

**Access pattern:**
```bash
# Update alert_threshold in config
jq '.alert_threshold = 90' /workspace/extra/job-scout/config/scoring.json > tmp.json
mv tmp.json /workspace/extra/job-scout/config/scoring.json
```

**Telegram Output Format:**
```
✅ Alert threshold updated

Old: 85 pts → New: 90 pts

This means only jobs scoring 90+ will trigger alerts.
Run re-scoring to apply to existing jobs.
```

### Task 3: Update Salary Expectations
**Purpose:** Change salary range preferences
**Example queries:**
- "Set target salary to $160K"
- "Update minimum salary to $130K"
- "My ideal salary is $200K"

**Access pattern:**
```bash
# Update salary fields
jq '.salary.target = 160000' /workspace/extra/job-scout/config/scoring.json > tmp.json
mv tmp.json /workspace/extra/job-scout/config/scoring.json
```

**Telegram Output Format:**
```
💰 Salary expectations updated

Minimum: $120K → $130K
Target: $150K → $160K
Ideal: $180K (unchanged)

Jobs meeting/exceeding target get bonus points.
```

### Task 4: Manage Priority Companies
**Purpose:** Add or remove companies that get scoring bonuses
**Example queries:**
- "Add Google to priority companies"
- "Remove Meta from priority list"
- "Make Airbnb a priority company"

**Access pattern:**
```bash
# Add company
jq '.priority_companies += ["Google"]' /workspace/extra/job-scout/config/scoring.json > tmp.json
mv tmp.json /workspace/extra/job-scout/config/scoring.json

# Remove company
jq '.priority_companies -= ["Meta"]' /workspace/extra/job-scout/config/scoring.json > tmp.json
mv tmp.json /workspace/extra/job-scout/config/scoring.json
```

**Telegram Output Format:**
```
🎯 Priority companies updated

Added: Google (+10 pts bonus)

Current priority list:
Adobe, Shopify, Figma, Stripe, Notion, Google

Jobs from these companies get +10 bonus.
```

### Task 5: Update Location Preferences
**Purpose:** Modify preferred work locations
**Example queries:**
- "Add New York to preferred locations"
- "Remove San Francisco preference"
- "I prefer remote only now"

**Access pattern:**
```bash
# Add location
jq '.preferred_locations += ["New York, NY"]' /workspace/extra/job-scout/config/scoring.json > tmp.json
mv tmp.json /workspace/extra/job-scout/config/scoring.json
```

**Telegram Output Format:**
```
📍 Location preferences updated

Added: New York, NY (+2 pts bonus)

Current preferences:
🏠 Remote (preferred)
📍 Toronto, ON
📍 San Francisco, CA
📍 New York, NY

Jobs matching these locations get +2 bonus.
```

### Task 6: Adjust Scoring Weights
**Purpose:** Fine-tune point values for different criteria
**Example queries:**
- "Increase remote bonus to 5 points"
- "Priority company bonus should be 15"
- "Make salary match worth more points"

**Access pattern:**
```bash
# Update scoring weights
jq '.scoring_weights.remote_bonus = 5' /workspace/extra/job-scout/config/scoring.json > tmp.json
mv tmp.json /workspace/extra/job-scout/config/scoring.json
```

**Telegram Output Format:**
```
⚖️ Scoring weights updated

Remote bonus: 2 pts → 5 pts

Current weights:
🎯 Priority company: +10
💰 Salary match: +3
🏠 Remote available: +5
📍 Location match: +2
💼 Title match: +5
```

### Task 7: Trigger Re-scoring
**Purpose:** Apply new config to all existing jobs
**Example queries:**
- "Re-score all jobs"
- "Apply new scoring to existing jobs"
- "Update scores with new config"

**Access pattern:**
```bash
# Run job-scout re-scoring script
cd /workspace/extra/job-scout
node src/rescore.js
```

**Telegram Output Format:**
```
🔄 Re-scoring 19 jobs with new config...

Completed:
- 3 jobs now high-scoring (85+)
- 6 jobs now candidates (70-84)
- 10 jobs below threshold

Score changes:
↗️ 5 jobs increased
↘️ 2 jobs decreased
→ 12 unchanged

Say "check jobs" to see updated results.
```

## Configuration File Structure
```json
{
  "alert_threshold": 85,
  "candidate_threshold": 70,
  "salary": {
    "minimum": 120000,
    "target": 150000,
    "ideal": 180000
  },
  "priority_companies": [
    "Adobe",
    "Shopify",
    "Figma",
    "Stripe",
    "Notion"
  ],
  "preferred_locations": [
    "Remote",
    "Toronto, ON",
    "San Francisco, CA"
  ],
  "scoring_weights": {
    "priority_company": 10,
    "salary_match": 3,
    "remote_bonus": 2,
    "location_bonus": 2,
    "title_match": 5,
    "senior_level": 3
  },
  "excluded_keywords": [
    "junior",
    "internship",
    "contract"
  ]
}
```

## Important Notes

### Validation
- Alert threshold must be >= candidate threshold
- Salary minimum <= target <= ideal
- Company names should match exactly (case-sensitive)
- Location strings should match job posting format

### Re-scoring Impact
- Changes only affect future jobs unless re-scoring is triggered
- Re-scoring can change which jobs are "high-scoring" vs "candidates"
- Always confirm before re-scoring to avoid confusion

### Backup
Before making changes, consider backing up current config:
```bash
cp /workspace/extra/job-scout/config/scoring.json /workspace/extra/job-scout/config/scoring.backup.json
```

## Error Handling
- Invalid JSON: "Config file is corrupted, restoring from backup"
- Invalid threshold: "Alert threshold must be >= candidate threshold"
- Invalid salary: "Salary values must be: minimum <= target <= ideal"
- Missing file: "Config file not found, creating default config"

## Advanced Features

### Bulk Updates
Multiple changes at once:
```bash
jq '
  .alert_threshold = 90 |
  .salary.target = 160000 |
  .priority_companies += ["Google"]
' scoring.json > tmp.json
```

### Reset to Defaults
```bash
# Restore original config
cp /workspace/extra/job-scout/config/scoring.default.json scoring.json
```

## Integration Notes
After adjusting scoring config:
1. Confirm changes with user
2. Offer to re-score existing jobs
3. If re-scored, offer to run `check-jobs` to see new results
4. Mention that future jobs will use new criteria automatically
