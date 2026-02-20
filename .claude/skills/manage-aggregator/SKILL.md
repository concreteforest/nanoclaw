# Manage ClaudeAggregator

Manage, review, and improve the RSS Feed Aggregator service. This skill provides guidance for working with the ClaudeAggregator project.

## Project Overview

**Location:** `~/ClaudeAggregator`

**Description:** A local web-based RSS feed aggregator built with Python (Flask) backend and React (Chakra UI) frontend.

**Tech Stack:**
- Backend: Python 3.x, Flask, SQLite
- Frontend: React, Chakra UI
- Features: Feed management, categories, automatic refresh, persistent storage

## Key Files & Directories

```
ClaudeAggregator/
├── backend/              # Flask API
│   ├── app.py           # Main Flask application
│   └── ...
├── frontend/            # React application
│   ├── src/
│   ├── package.json
│   └── ...
├── data/                # SQLite database
├── deployment/          # Deployment configs
├── README.md
└── SECURITY.md
```

## Common Tasks

### Review & Audit Code
1. **Read key files:** `backend/app.py`, `frontend/src/App.jsx`
2. **Check for:** Security issues, performance problems, outdated dependencies
3. **Review:** Error handling, input validation, database queries

### Run Locally for Testing
```bash
cd ~/ClaudeAggregator
# Backend: pip install -r requirements.txt && python app.py
# Frontend: cd frontend && npm install && npm start
```

### Improve Features
- Suggest new RSS feed categories
- Improve the UI/UX with Chakra UI
- Add better search/filtering
- Optimize feed refresh performance

### Deploy Changes
- Uses Docker: `docker-compose build && docker-compose up`
- See `DEPLOYMENT.md` for full instructions
- Check `SECURITY.md` for security best practices

## When to Use This Skill

Use this skill when you need to:
- Review ClaudeAggregator code for bugs or improvements
- Add new features to the RSS aggregator
- Fix security issues or performance problems
- Help Nano understand the project structure
- Prepare code for deployment

## Commands for Nano

Ask Nano to:
- "Review the ClaudeAggregator code for security issues"
- "Add a feature to export feeds as OPML"
- "Fix any bugs in the feed refresh logic"
- "Improve the frontend UI with better error states"
- "Check dependencies for updates"
