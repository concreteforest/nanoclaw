# Manage Recipe Advisor

Manage, review, and improve the Recipe Advisor service. This skill provides guidance for working with the RecipeAdvisor project.

## Project Overview

**Location:** `~/RecipeAdvisor`

**Description:** An AI-powered recipe and health advisor using Google Gemini, designed for meal planning, recipe generation, ingredient tracking, and nutrition monitoring. Can analyze fridge photos for recipe suggestions.

**Tech Stack:**
- Backend: Python (Flask)
- AI: Google Gemini API
- Frontend: Web-based UI
- Database: SQLite
- Features: Recipe generation, nutrition tracking, ingredient management, photo analysis

**Note:** Currently needs work on persistent nutrition tracking - the system isn't properly remembering previously entered foods.

## Key Files & Directories

```
RecipeAdvisor/
├── app.py              # Main Flask application
├── database.py         # Database models and operations
├── data/              # SQLite database & user data
├── docker-compose.yml # Docker configuration
├── requirements.txt   # Python dependencies
├── README.md
├── DEPLOYMENT.md
└── .env               # Configuration (with API keys)
```

## Core Features

### Recipe Generation
- Text-based queries with dietary preferences (Keto, Vegetarian, Vegan, Gluten-Free, Paleo, Mediterranean)
- Fridge photo analysis for ingredient-based suggestions
- AI macro estimation
- Recipe saving with auto-naming

### Ingredient Management
- Natural language entry ("add 2 cups of flour")
- Fridge photo scanning for inventory building
- Manual ingredient entry
- Categorized viewing (Protein, Dairy, Vegetables, Fruits, Grains, Pantry)

### Nutrition Tracking
- Multi-user support with individual profiles
- **⚠️ KNOWN ISSUE:** Nutrition data not persisting properly between sessions

## Known Issues & Improvements Needed

### Priority 1: Fix Nutrition Tracking
- **Problem:** System doesn't remember previously entered foods/nutrition data
- **Impact:** Nutrition tracking is ineffective
- **Solution areas:**
  - Check database.py for persistence logic
  - Verify session management
  - Ensure user data is being saved/loaded correctly

### Other Improvements
- Enhance recipe filtering by dietary restrictions
- Improve fridge photo analysis accuracy
- Add meal planning/scheduling features
- Add grocery list generation
- Improve error handling and user feedback

## Development & Testing

### Local Development
```bash
cd ~/RecipeAdvisor
pip install -r requirements.txt
export FLASK_ENV=development
export GEMINI_API_KEY=your_key
python app.py
```

### Docker Deployment
```bash
docker-compose build
docker-compose up
```

### Testing Nutrition Tracking
1. Add a food item to a user profile
2. Refresh/reload the page
3. Verify the food item still appears
4. Check database.py to trace the issue

## When to Use This Skill

Use this skill when you need to:
- Fix the nutrition tracking persistence issue
- Review code for bugs or security issues
- Add new features (meal planning, grocery lists, etc.)
- Improve recipe generation algorithm
- Enhance dietary restriction support
- Help Nano understand the project
- Deploy or update the service

## Commands for Nano

Ask Nano to:
- "Fix the nutrition tracking - foods aren't persisting"
- "Review the database.py for data persistence issues"
- "Add meal planning/scheduling features"
- "Improve the recipe filtering by dietary preferences"
- "Add a grocery list generator based on recipes"
- "Check the Gemini API integration"
- "Audit the code for security issues"
- "Add better error handling and user feedback"

## Configuration

**Environment variables** (in `.env`):
- `GEMINI_API_KEY` - Google Gemini API key
- `FLASK_ENV` - Development or production
- Database path - SQLite database location

## Deployment Notes

- Designed for Raspberry Pi with CasaOS
- Can run standalone or in Docker
- Requires Google Gemini API key
- See DEPLOYMENT.md for full instructions
