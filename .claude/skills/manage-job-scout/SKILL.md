# Manage Job Scout

Manage, review, and improve the Job Scout service. This skill provides guidance for working with the job-scout project.

## Project Overview

**Location:** `~/job-scout`

**Description:** A Node.js service that pulls job listings, scores them based on your preferences, and sends relevant opportunities via Telegram. Integrates with your preferred job boards.

**Tech Stack:**
- Runtime: Node.js
- Config: YAML-based configuration
- Scoring: Customizable scoring algorithm
- Integration: Telegram notifications
- Storage: SQLite database

## Key Files & Directories

```
job-scout/
├── src/                 # Source code
│   ├── index.js        # Main entry point
│   └── ...
├── config/             # Configuration files
│   └── config.yaml
├── data/               # Database and cache
├── scripts/            # Helper scripts
├── package.json
├── VPS_SETUP.md       # Deployment guide
├── PHASE3_SETUP.md    # Advanced configuration
├── PRIVACY.md         # Privacy & data handling
└── QUICK_START.md     # Quick start guide
```

## Key Configuration

**Main config file:** `~/job-scout/config/config.yaml`

**Job scoring logic:** Customizable thresholds for:
- Keywords (must-have, nice-to-have, exclude)
- Salary ranges
- Location preferences
- Company filters
- Experience level

## Common Tasks

### Review & Audit Code
1. **Read:** `src/index.js` and scoring logic
2. **Check:** Job board API integrations
3. **Verify:** Telegram integration
4. **Review:** Database queries and performance

### Improve Scoring Logic
1. **Edit:** `config/config.yaml` scoring section
2. **Test:** Use `test-config-scoring.js` to verify changes
3. **Deploy:** Restart the service

### Manage Configuration
- Adjust keywords and scoring weights
- Add/remove job boards
- Update Telegram settings
- Modify refresh intervals

### Monitor & Debug
- Check logs: `tail -f bot.log`
- Test scoring: `node test-config-scoring.js`
- Verify config: `node test-config-changes.js`

## Deployment

**Start service:**
```bash
cd ~/job-scout && npm start
```

**Stop service:**
```bash
systemctl --user stop job-scout
```

**View logs:**
```bash
journalctl --user -u job-scout -f
```

## When to Use This Skill

Use this skill when you need to:
- Review the job scoring algorithm
- Add new job boards or filters
- Fix bugs in job detection or scoring
- Optimize performance
- Help Nano understand the configuration
- Update job search preferences

## Commands for Nano

Ask Nano to:
- "Review the job scout scoring logic"
- "Add new job boards to the config"
- "Improve the keyword matching algorithm"
- "Fix any bugs in the Telegram integration"
- "Check if we're missing good opportunities due to scoring"
- "Update the salary filters based on current market"
