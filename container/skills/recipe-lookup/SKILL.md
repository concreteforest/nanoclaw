# recipe-lookup

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Project:** RecipeAdvisor
**Status:** Active

## Purpose
Search and retrieve saved recipes from RecipeAdvisor database with nutritional information. Find recipes by name, ingredients, or dietary preferences.

## Access Method
**SQLite Database** + Python module imports

Primary database: `/workspace/extra/RecipeAdvisor/data/recipes.db`
Python module: `/workspace/extra/RecipeAdvisor/database.py`

**Note:** Paths use container standard `/workspace/extra/` mount point. The RecipeAdvisor project is mounted from the host system via the container configuration.

## Common Tasks

### Task 1: Search Recipes by Name
**Default behavior:** Return top 5 matching recipes with macros
**Example queries:**
- "Find chicken recipes"
- "Search for pasta dishes"
- "Show me breakfast recipes"

**Access pattern:**
```python
import sys
sys.path.append('/workspace/extra/RecipeAdvisor')
from database import search_recipes

results = search_recipes(query="chicken", limit=5)
# Returns list of recipe objects
```

**Alternative (SQL):**
```bash
sqlite3 /workspace/extra/RecipeAdvisor/data/recipes.db \
  "SELECT name, calories, protein, carbs, fat FROM recipes
   WHERE name LIKE '%chicken%' LIMIT 5;"
```

**Telegram Output Format:**
```
🍳 Found 3 Recipes:

*Chicken & Broccoli Stir-Fry*
450 cal | 35g protein | 25g carbs | 18g fat

*Grilled Lemon Chicken*
380 cal | 42g protein | 12g carbs | 16g fat

*Chicken Curry*
520 cal | 38g protein | 32g carbs | 24g fat

(Say "show full recipe #1" for ingredients/instructions)
```

### Task 2: Get Full Recipe Details
**Purpose:** View complete recipe with ingredients and instructions
**Example queries:**
- "Show full recipe for Chicken Stir-Fry"
- "Give me the complete Grilled Chicken recipe"
- "Show recipe #1 in detail"

**Access pattern:**
```python
from database import get_recipe_by_id, get_recipe_by_name

recipe = get_recipe_by_name("Chicken & Broccoli Stir-Fry")
# Returns: {name, ingredients, instructions, calories, protein, carbs, fat}
```

**Telegram Output Format:**
```
🍳 Chicken & Broccoli Stir-Fry

*Nutrition (per serving):*
450 cal | 35g protein | 25g carbs | 18g fat

*Ingredients:*
• 8oz chicken breast, diced
• 2 cups broccoli florets
• 2 tbsp olive oil
• 2 cloves garlic, minced
• 2 tbsp soy sauce
• 1 tsp ginger

*Instructions:*
1. Heat oil in large pan over med-high heat
2. Add chicken, cook until golden (5-7 min)
3. Add garlic and ginger, cook 1 min
4. Add broccoli and soy sauce
5. Stir-fry until broccoli tender (4-5 min)
6. Serve immediately

(Serves 2 | Prep: 10 min | Cook: 15 min)
```

### Task 3: Filter by Macros/Calories
**Purpose:** Find recipes that fit specific nutritional targets
**Example queries:**
- "Show high-protein recipes"
- "Find low-carb meals under 400 calories"
- "Recipes with at least 30g protein"

**Access pattern:**
```sql
sqlite3 /workspace/extra/RecipeAdvisor/data/recipes.db \
  "SELECT name, calories, protein, carbs, fat FROM recipes
   WHERE protein >= 30 AND calories <= 500
   LIMIT 5;"
```

**Telegram Output Format:**
```
🍳 High-Protein Recipes (<500 cal):

*Grilled Salmon Bowl*
420 cal | 42g protein | 20g carbs | 18g fat

*Chicken & Broccoli Stir-Fry*
450 cal | 35g protein | 25g carbs | 18g fat

*Turkey Chili*
380 cal | 38g protein | 28g carbs | 12g fat

(3 recipes match: protein ≥30g, calories ≤500)
```

### Task 4: Search by Ingredients
**Purpose:** Find recipes using specific ingredients
**Example queries:**
- "What can I make with chicken and broccoli?"
- "Recipes using salmon"
- "Find dishes with eggs"

**Access pattern:**
```python
from database import search_by_ingredients

recipes = search_by_ingredients(ingredients=["chicken", "broccoli"], limit=5)
```

**Alternative (SQL):**
```sql
SELECT name, calories, protein FROM recipes
WHERE ingredients LIKE '%chicken%' AND ingredients LIKE '%broccoli%'
LIMIT 5;
```

**Telegram Output Format:**
```
🍳 Recipes with Chicken & Broccoli:

*Chicken & Broccoli Stir-Fry*
450 cal | 35g protein | 25g carbs | 18g fat

*Chicken Broccoli Alfredo*
580 cal | 32g protein | 42g carbs | 28g fat

(2 recipes found using those ingredients)
```

### Task 5: List All Recipes
**Purpose:** Browse entire recipe collection
**Example queries:**
- "Show all recipes"
- "What recipes do I have?"
- "List my recipe collection"

**Access pattern:**
```sql
sqlite3 /workspace/extra/RecipeAdvisor/data/recipes.db \
  "SELECT name, calories FROM recipes ORDER BY name LIMIT 10;"
```

**Telegram Output Format:**
```
🍳 Recipe Collection (showing 10 of 25):

• Chicken & Broccoli Stir-Fry (450 cal)
• Chicken Curry (520 cal)
• Grilled Lemon Chicken (380 cal)
• Grilled Salmon Bowl (420 cal)
• Overnight Oats (320 cal)
• Protein Pancakes (280 cal)
• Scrambled Eggs & Toast (310 cal)
• Turkey Chili (380 cal)
• Veggie Omelet (250 cal)
• Yogurt Parfait (290 cal)

(25 total recipes. Say "show more" or search by name)
```

## Database Schema
```sql
CREATE TABLE recipes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  ingredients TEXT,
  instructions TEXT,
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  servings INTEGER DEFAULT 1,
  prep_time INTEGER,
  cook_time INTEGER,
  category TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Python Module Usage
```python
import sys
sys.path.append('/workspace/extra/RecipeAdvisor')
from database import (
  search_recipes,
  get_recipe_by_id,
  get_recipe_by_name,
  search_by_ingredients,
  filter_by_macros
)

# Search by name
recipes = search_recipes("chicken", limit=5)

# Get specific recipe
recipe = get_recipe_by_name("Chicken Stir-Fry")

# Filter by nutrition
high_protein = filter_by_macros(min_protein=30, max_calories=500, limit=5)

# Search by ingredients
matches = search_by_ingredients(["chicken", "broccoli"], limit=5)
```

## Important Notes

### Message Length Management
- **Preview mode (default):** Show name + macros only (5 recipes)
- **Full recipe:** Only show on request (can be 300+ characters per recipe)
- **Progressive disclosure:** "Say 'show full recipe' for ingredients/instructions"

### Markdown Formatting
- Use `*bold*` for recipe names
- Use bullet points (•) for ingredients
- Numbered lists for instructions
- Pipe separators (|) for macro display

### Accuracy
- All macro values are per serving
- Include servings count if > 1
- Show prep + cook time when available
- Round macros to nearest gram

### Context Awareness
When user references "that recipe" or "#1":
- Track last shown search results
- Map their reference to specific recipe
- Confirm which recipe before showing full details

## Error Handling
- No recipes found: "No recipes found for '{query}'. Try different keywords or 'list all recipes'"
- Database error: "Could not access recipe database"
- Missing macros: "Recipe found but nutritional info incomplete"
- Ambiguous reference: "Which recipe? Say the name or number from list"

## Integration with Other Skills

### With generate-recipe
After generating a new recipe:
- Offer to save it to database
- Show in search results immediately
- Include in recipe count

### With track-nutrition
When logging food:
- Suggest matching recipes from database
- Auto-fill macros from saved recipes
- Link logged meals to recipe IDs

## Advanced Features

### Sorting Options
```sql
ORDER BY protein DESC  -- High protein first
ORDER BY calories ASC  -- Low calorie first
ORDER BY name ASC      -- Alphabetical
ORDER BY created_at DESC  -- Newest first
```

### Category Filtering
```sql
WHERE category IN ('breakfast', 'lunch', 'dinner', 'snack')
```

### Macro Range Queries
```sql
WHERE protein BETWEEN 30 AND 50
  AND carbs <= 30
  AND calories BETWEEN 400 AND 600
```
