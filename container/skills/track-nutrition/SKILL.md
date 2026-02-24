# track-nutrition

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Project:** RecipeAdvisor
**Status:** Active

## Purpose
Log meals and track daily nutritional intake (calories, protein, carbs, fat) against personal targets. View daily totals, progress toward goals, and food history.

## Access Method
**SQLite Database** + Python module imports

Primary database: `/workspace/extra/RecipeAdvisor/data/recipe_advisor.db`
Python module: `/workspace/extra/RecipeAdvisor/database.py`

**Note:** Paths use container standard `/workspace/extra/` mount point. The RecipeAdvisor project is mounted from the host system via the container configuration.

## Common Tasks

### Task 1: Log a Meal/Food
**Required:** Food name and nutritional info (or reference to saved recipe)
**Example queries:**
- "Log 2 eggs and toast for breakfast"
- "Track my lunch: chicken salad, 450 calories"
- "Add that recipe I just made to my food log"

**Access pattern:**
```python
import sys
sys.path.append('/workspace/extra/RecipeAdvisor')
from database import log_food
from datetime import date

# Log individual food
log_id = log_food(
    user_id=1,
    food_name="Scrambled Eggs & Toast",
    calories=310,
    protein_g=22,
    carbs_g=18,
    fat_g=16,
    meal_type="breakfast",  # breakfast, lunch, dinner, snack
    logged_date=date.today().isoformat(),
    notes="Whole wheat toast"
)
```

**Telegram Output Format:**
```
✅ Logged: Scrambled Eggs & Toast

*Nutrition:*
310 cal | 22g protein | 18g carbs | 16g fat

*Meal:* Breakfast
*Today's Total:* 310/2000 cal

(Say "show today's meals" to see full log)
```

### Task 2: Log Food from Saved Recipe
**Purpose:** Use nutritional data from a saved recipe
**Example queries:**
- "Log that Chicken Stir-Fry recipe for dinner"
- "Add my saved Veggie Scramble to breakfast log"
- "Track the recipe I made today"

**Access pattern:**
```python
from database import get_recipe_by_name, log_food

# Find saved recipe
recipe = get_recipe_by_name("Chicken & Broccoli Stir-Fry")

if recipe:
    log_id = log_food(
        user_id=1,
        food_name=recipe['recipe_name'],
        calories=recipe.get('estimated_calories'),
        protein_g=recipe.get('estimated_protein_g'),
        carbs_g=recipe.get('estimated_carbs_g'),
        fat_g=recipe.get('estimated_fat_g'),
        meal_type="dinner",
        recipe_id=recipe['id'],  # Link to recipe
        notes="Homemade"
    )
```

**Telegram Output Format:**
```
✅ Logged: Chicken & Broccoli Stir-Fry

*Nutrition:*
450 cal | 35g protein | 25g carbs | 18g fat

*Meal:* Dinner
*Linked to recipe:* ✓

*Today's Total:* 1,420/2,000 cal
```

### Task 3: View Today's Meals
**Default behavior:** Show all logged meals for today with totals
**Example queries:**
- "What did I eat today?"
- "Show today's food log"
- "What are my totals so far?"

**Access pattern:**
```python
from database import get_food_log_by_date, get_daily_totals, get_user_profile
from datetime import date

# Get today's log
today = date.today().isoformat()
meals = get_food_log_by_date(user_id=1, log_date=today)

# Get totals
totals = get_daily_totals(user_id=1, log_date=today)

# Get user targets
profile = get_user_profile(user_id=1)
target_cals = profile.get('target_calories', 2000)
target_protein = profile.get('target_protein_g', 150)
```

**Telegram Output Format:**
```
📊 Today's Nutrition (Feb 20)

*Meals:*
🌅 Breakfast
• Scrambled Eggs & Toast
  310 cal | 22g protein

🌞 Lunch
• Grilled Chicken Salad
  420 cal | 38g protein

🌙 Dinner
• Chicken & Broccoli Stir-Fry
  450 cal | 35g protein

---
*Today's Totals:*
Calories: 1,180 / 2,000 (59%)
Protein: 95g / 150g (63%)
Carbs: 82g
Fat: 48g

💪 820 calories remaining
(Say "log [food]" to add more meals)
```

### Task 4: View Daily Totals & Progress
**Purpose:** See macro breakdown and progress toward goals
**Example queries:**
- "How am I doing today?"
- "Show my calorie progress"
- "Am I hitting my protein target?"

**Access pattern:**
```python
from database import get_daily_totals, get_user_profile

totals = get_daily_totals(user_id=1)
profile = get_user_profile(user_id=1)

# Calculate percentages
cal_pct = (totals['total_calories'] / profile['target_calories']) * 100
protein_pct = (totals['total_protein'] / profile['target_protein_g']) * 100
```

**Telegram Output Format:**
```
📊 Today's Progress

*Calories:* 1,180 / 2,000 (59%)
▓▓▓▓▓▓░░░░ 820 remaining

*Protein:* 95g / 150g (63%)
▓▓▓▓▓▓░░░░ 55g to go

*Carbs:* 82g
*Fat:* 48g

🎯 On track! Need 1 more high-protein meal.
```

### Task 5: View Food Log by Date
**Purpose:** Review past days' nutrition
**Example queries:**
- "What did I eat yesterday?"
- "Show me last Monday's meals"
- "Food log for February 18th"

**Access pattern:**
```python
from database import get_food_log_by_date, get_daily_totals

# Parse date from user query (examples)
# "yesterday" -> date.today() - timedelta(days=1)
# "February 18th" -> date(2024, 2, 18)

log_date = "2024-02-18"
meals = get_food_log_by_date(user_id=1, log_date=log_date)
totals = get_daily_totals(user_id=1, log_date=log_date)
```

**Telegram Output Format:**
```
📊 Food Log - February 18, 2024

*Meals:*
🌅 Breakfast
• Protein Oats (320 cal)

🌞 Lunch
• Turkey Sandwich (410 cal)

🌙 Dinner
• Grilled Salmon Bowl (480 cal)

---
*Daily Totals:*
1,210 cal | 98g protein | 105g carbs | 42g fat

(3 meals logged that day)
```

### Task 6: Delete/Remove Food Log Entry
**Purpose:** Correct mistakes or remove duplicate entries
**Example queries:**
- "Delete that last meal"
- "Remove the breakfast entry"
- "Undo the last food log"

**Access pattern:**
```python
from database import get_food_log_by_date, delete_food_log
from datetime import date

# Get today's meals
meals = get_food_log_by_date(user_id=1, log_date=date.today().isoformat())

# Delete most recent (or specific by ID)
if meals:
    last_meal = meals[-1]  # Most recent
    delete_food_log(last_meal['id'])
```

**Telegram Output Format:**
```
🗑️ Deleted: Scrambled Eggs & Toast

*Updated Today's Total:* 870/2,000 cal

(Say "show today's meals" to verify)
```

### Task 7: Quick Macro Estimation with AI
**Purpose:** Estimate macros for foods without nutritional data
**Example queries:**
- "How many calories in 1 cup of rice?"
- "Estimate macros for a medium apple"
- "What's the nutrition for 4oz grilled chicken?"

**Access pattern:**
```python
from google import genai
import os

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

prompt = f"""Provide estimated nutritional information for:

Food: {food_query}

Return ONLY in this exact format:
Calories: X
Protein: Xg
Carbs: Xg
Fat: Xg

Be as accurate as possible using USDA standards."""

response = client.models.generate_content(
    model='gemini-2.0-flash-exp',
    contents=prompt
)

# Parse response and offer to log it
```

**Telegram Output Format:**
```
📊 Estimated Nutrition: 1 cup cooked rice

Calories: 205
Protein: 4g
Carbs: 45g
Fat: 0.5g

(Say "log this" to add to your food log)
```

### Task 8: Set/Update Nutritional Targets
**Purpose:** Configure daily calorie and macro goals
**Example queries:**
- "Set my calorie target to 2200"
- "Update protein goal to 180g"
- "Change my daily targets"

**Access pattern:**
```python
from database import update_user_profile

update_user_profile(
    user_id=1,
    target_calories=2200,
    target_protein_g=180,
    target_carbs_g=220,
    target_fat_g=70
)
```

**Telegram Output Format:**
```
✅ Nutritional Targets Updated

*Daily Goals:*
Calories: 2,200
Protein: 180g
Carbs: 220g
Fat: 70g

Your progress tracking will use these new targets.
```

## Database Schema

```sql
-- Food log entries
CREATE TABLE food_log (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    food_name TEXT NOT NULL,
    calories INTEGER,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    meal_type TEXT,           -- breakfast, lunch, dinner, snack
    logged_date DATE NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recipe_id INTEGER,        -- Optional link to saved recipe
    notes TEXT
);

-- User profiles with targets
CREATE TABLE user_profiles (
    id INTEGER PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    target_calories INTEGER,
    target_protein_g REAL,
    target_carbs_g REAL,
    target_fat_g REAL,
    dietary_preference TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Python Module Reference

```python
import sys
sys.path.append('/workspace/extra/RecipeAdvisor')
from database import (
    log_food,               # Add food entry
    get_food_log_by_date,  # Get meals for specific date
    get_daily_totals,      # Get sum of macros for date
    delete_food_log,       # Remove entry
    get_user_profile,      # Get targets
    update_user_profile    # Set targets
)

from datetime import date, timedelta

# Log food
log_id = log_food(
    user_id=1,
    food_name="Chicken Breast",
    calories=165,
    protein_g=31,
    carbs_g=0,
    fat_g=3.6,
    meal_type="lunch",
    logged_date=date.today().isoformat()
)

# Get today's meals
meals = get_food_log_by_date(user_id=1)

# Get totals
totals = get_daily_totals(user_id=1)
# Returns: {'total_calories': X, 'total_protein': X, 'total_carbs': X, 'total_fat': X}
```

## Important Notes

### Message Formatting

**Progress Bars:**
Use simple ASCII bars for visual progress:
```
▓▓▓▓▓▓░░░░ 60%
```

**Meal Type Emojis:**
- 🌅 Breakfast
- 🌞 Lunch
- 🌙 Dinner
- 🍎 Snack

### Context Awareness

**"That recipe" references:**
- Track last generated/viewed recipe
- When user says "log that", infer from context
- Confirm before logging if ambiguous

**Smart date parsing:**
- "today" → current date
- "yesterday" → date.today() - timedelta(days=1)
- "last Monday" → calculate previous Monday
- "February 18th" → parse to date object

### Nutritional Data Sources

**Priority order:**
1. **Saved recipes** - Use stored nutritional data
2. **User-provided** - Trust user's input
3. **AI estimation** - Use Gemini for quick estimates
4. **USDA database** - Most accurate (if integrated)

### Rounding & Display

- Round calories to nearest 5
- Round macros to nearest gram
- Show percentages as whole numbers
- Display totals with commas (1,420 not 1420)

## Integration with Other Skills

### With recipe-lookup
When viewing a saved recipe:
- Offer to "log this recipe"
- Auto-fill macros from recipe data
- Link log entry to recipe ID

### With generate-recipe
After generating a recipe:
- Suggest saving it first
- Then offer to log it
- Track recipe-based meals vs generic foods

### With manage-feeds (Aggregator)
When user reads nutrition article:
- Offer to update their targets
- Suggest logging related foods
- Track nutrition insights

## Error Handling

- **No profile/targets set**: "Targets not configured. Say 'set my calorie goal to X' to get started."
- **Invalid date**: "Could not understand date. Try 'yesterday', 'today', or 'February 18th'."
- **Missing macros**: "Please provide calories or nutritional info to log this food."
- **Database error**: "Could not save to food log. Try again."
- **No meals logged**: "No meals logged for {date}. Say 'log [food]' to add meals."

## Advanced Features

### Weekly Summary
```python
from datetime import date, timedelta

# Get last 7 days
end_date = date.today()
summaries = []

for i in range(7):
    log_date = (end_date - timedelta(days=i)).isoformat()
    totals = get_daily_totals(user_id=1, log_date=log_date)
    summaries.append({
        'date': log_date,
        'totals': totals
    })

# Calculate averages
avg_calories = sum(s['totals']['total_calories'] for s in summaries) / 7
avg_protein = sum(s['totals']['total_protein'] for s in summaries) / 7
```

**Telegram Output:**
```
📊 7-Day Summary

*Daily Averages:*
Calories: 1,850
Protein: 142g
Carbs: 178g
Fat: 64g

*Consistency:* 6/7 days logged
🎯 Avg 92% of calorie target
💪 Avg 95% of protein target
```

### Meal Streaks
Track consecutive days of logging:
```python
# Check if meals logged for consecutive days
# Show: "🔥 5-day logging streak!"
```

### Macro Distribution
Show percentage breakdown:
```
📊 Today's Macro Split

Protein: 32% (95g)
Carbs: 45% (82g)
Fat: 23% (48g)

(Recommended: 30/40/30 for your goals)
```

### Auto-Suggestions
Based on remaining macros:
```
💡 Suggested Next Meal:

To hit your protein goal, try:
• Grilled chicken (35g protein)
• Protein shake (25g protein)
• Greek yogurt (20g protein)

(You need 55g more protein today)
```

## Best Practices

### User Experience
- Always show updated totals after logging
- Confirm before deleting entries
- Suggest meals when targets not met
- Celebrate when goals are hit
- Make logging quick and frictionless

### Data Quality
- Encourage linking to saved recipes (more accurate)
- Validate nutritional data (e.g., protein + carbs + fat × 9 ≈ calories)
- Allow notes for context
- Track meal types for pattern analysis

### Privacy & Data
- All nutrition data is user-specific (user_id filtered)
- Food logs are dated for historical tracking
- Can delete individual entries
- Profile targets are updateable anytime
