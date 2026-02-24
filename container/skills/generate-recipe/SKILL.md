# generate-recipe

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Project:** RecipeAdvisor
**Status:** Active

## Purpose
Generate AI-powered recipe ideas using Gemini AI based on user preferences, ingredients on hand, dietary restrictions, and health goals. Creates complete recipes with ingredients, instructions, and nutritional information.

## Access Method
**Gemini AI API** + Python module imports

Primary database: `/workspace/extra/RecipeAdvisor/data/recipe_advisor.db`
Python module: `/workspace/extra/RecipeAdvisor/database.py`

**Note:** Paths use container standard `/workspace/extra/` mount point. The RecipeAdvisor project is mounted from the host system via the container configuration.

## Common Tasks

### Task 1: Generate Recipe from Query
**Default behavior:** Create a complete recipe with nutrition info
**Example queries:**
- "Give me a healthy breakfast recipe"
- "Create a high-protein chicken dinner"
- "Generate a quick vegetarian lunch recipe"

**Access pattern:**
```python
from google import genai
import os

# Initialize Gemini client
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

# User's dietary preference (if known)
dietary_pref = "None"  # or "Vegetarian", "Vegan", "Keto", "Paleo", etc.

# Build prompt
prompt = f"""You are a health-focused recipe advisor. Generate a detailed, healthy recipe based on this request:

Request: {user_query}

Dietary preference: {dietary_pref}

Please include:
1. Recipe title
2. Ingredients list with quantities
3. Step-by-step cooking instructions
4. Estimated nutritional information (calories, protein, carbs, fat)
5. Health benefits or nutritional highlights
6. Prep time and cook time

Format your response in a clear, easy-to-read way."""

# Generate recipe
response = client.models.generate_content(
    model='gemini-2.0-flash-exp',
    contents=prompt
)

recipe_text = response.text
```

**Telegram Output Format:**
```
🍳 Recipe Generated!

**Healthy Veggie Scramble**

*Nutrition (per serving):*
310 cal | 22g protein | 18g carbs | 16g fat

*Ingredients:*
• 3 large eggs
• 1/4 cup diced bell peppers
• 1/4 cup chopped spinach
• 1 tbsp olive oil
• Salt & pepper to taste

*Instructions:*
1. Heat olive oil in non-stick pan over medium heat
2. Add bell peppers, sauté 2-3 minutes
3. Add spinach, cook until wilted (1 min)
4. Beat eggs in bowl, pour into pan
5. Scramble gently until cooked (3-4 min)
6. Season with salt and pepper

⏱️ Prep: 5 min | Cook: 10 min

(Say "save this recipe" to add to your collection)
```

### Task 2: Generate Recipe with Available Ingredients
**Purpose:** Create recipes using specific ingredients user has on hand
**Example queries:**
- "What can I make with chicken, broccoli, and rice?"
- "Create a recipe using eggs, spinach, and cheese"
- "Generate recipe with ingredients I have"

**Access pattern:**
```python
# Load user's current ingredients
import sys
sys.path.append('/workspace/extra/RecipeAdvisor')
from database import get_user_ingredients

ingredients = get_user_ingredients(user_id=1)
ingredient_names = [ing['name'] for ing in ingredients]

# Build ingredient-focused prompt
prompt = f"""Create a healthy recipe using these available ingredients:

{', '.join(ingredient_names)}

You can also suggest common pantry staples (oil, salt, spices).

Include:
1. Recipe title
2. Ingredients with quantities
3. Step-by-step instructions
4. Nutritional info
5. Prep/cook time

Focus on maximizing the use of available ingredients."""

response = client.models.generate_content(
    model='gemini-2.0-flash-exp',
    contents=prompt
)
```

**Telegram Output Format:**
```
🍳 Recipe from Your Ingredients

**Chicken & Broccoli Stir-Fry**

*Using:* chicken breast, broccoli, garlic, rice
*Plus:* olive oil, soy sauce, ginger

*Nutrition:*
450 cal | 35g protein | 42g carbs | 14g fat

[Full recipe...]

✅ Uses 4 of your available ingredients!
```

### Task 3: Generate Recipe for Specific Macro Targets
**Purpose:** Create recipes that fit nutritional goals
**Example queries:**
- "Generate a high-protein meal under 500 calories"
- "Create a low-carb dinner recipe"
- "Give me a recipe with at least 30g protein"

**Access pattern:**
```python
# Load user profile if available
from database import get_user_profile

profile = get_user_profile(user_id=1)
target_cals = profile.get('target_calories')
target_protein = profile.get('target_protein_g')

prompt = f"""Generate a recipe that fits these nutritional targets:

Calories: {target_cals or 'around 500'} cal
Protein: {target_protein or 'at least 30'}g
Carbs: moderate
Fat: healthy fats preferred

User preference: {dietary_pref}

Include full recipe details with accurate nutritional breakdown."""

response = client.models.generate_content(
    model='gemini-2.0-flash-exp',
    contents=prompt
)
```

**Telegram Output Format:**
```
🍳 High-Protein Recipe

**Grilled Salmon with Quinoa**

*Nutrition (per serving):*
480 cal | 42g protein | 38g carbs | 16g fat

✅ Hits your protein target (42g)
✅ Within calorie budget (480 cal)
✅ Balanced macros

[Full recipe...]

(Fits your nutritional goals!)
```

### Task 4: Generate Recipe by Meal Type
**Purpose:** Create meal-specific recipes (breakfast, lunch, dinner, snack)
**Example queries:**
- "Generate a healthy breakfast recipe"
- "Give me a quick lunch idea"
- "Create a dinner recipe for tonight"
- "Suggest a high-protein snack"

**Access pattern:**
```python
meal_type = "breakfast"  # or lunch, dinner, snack

prompt = f"""Generate a healthy {meal_type} recipe.

Requirements:
- Appropriate for {meal_type}
- Balanced nutrition
- Reasonable prep time
- Easy to make

Dietary preference: {dietary_pref}

Include full details: ingredients, instructions, nutrition, timing."""

response = client.models.generate_content(
    model='gemini-2.0-flash-exp',
    contents=prompt
)
```

**Telegram Output Format:**
```
🍳 Breakfast Recipe

**Protein Overnight Oats**

*Nutrition:*
320 cal | 24g protein | 42g carbs | 8g fat

*Ingredients:*
• 1/2 cup rolled oats
• 1 cup milk (or almond milk)
• 1 scoop protein powder
• 1 tbsp chia seeds
• Fresh berries

*Instructions:*
1. Mix oats, milk, protein powder in jar
2. Add chia seeds, stir well
3. Refrigerate overnight (8+ hours)
4. Top with berries before eating

⏱️ Prep: 5 min | Wait: overnight

(Perfect for meal prep!)
```

### Task 5: Save Generated Recipe to Database
**Purpose:** Store AI-generated recipe for future reference
**Example queries:**
- "Save this recipe"
- "Add that to my recipe collection"
- "Store the recipe you just made"

**Access pattern:**
```python
from database import save_recipe

# Extract recipe name from content (use Gemini to parse)
name_prompt = f"""Extract a short, catchy recipe name from this recipe content. Return ONLY the recipe name, nothing else.

Recipe content:
{recipe_text[:500]}

Return only the recipe name (max 50 characters), no quotes or extra text."""

name_response = client.models.generate_content(
    model='gemini-2.0-flash-exp',
    contents=name_prompt
)
recipe_name = name_response.text.strip().strip('"').strip("'")

# Save to database
recipe_id = save_recipe(
    user_id=1,
    recipe_name=recipe_name,
    recipe_content=recipe_text,
    dietary_preference=dietary_pref,
    notes="Generated by AI"
)
```

**Telegram Output Format:**
```
💾 Recipe Saved!

**Healthy Veggie Scramble** added to your collection

You now have 12 saved recipes.
(Say "list recipes" to see all saved recipes)
```

## Gemini API Configuration

### Required Environment Variable
```bash
export GEMINI_API_KEY="your-gemini-api-key"
```

### Model Selection
- **gemini-2.0-flash-exp**: Fast, cost-effective, good for most recipes
- **gemini-1.5-pro**: Higher quality, more detailed recipes

### Prompt Engineering Tips

**Good prompts include:**
- Specific dietary preferences
- Macro targets or calorie limits
- Meal type (breakfast/lunch/dinner)
- Available ingredients
- Cooking skill level
- Time constraints

**Example comprehensive prompt:**
```
Generate a vegetarian dinner recipe:
- High protein (30g+)
- Under 500 calories
- Uses ingredients: quinoa, chickpeas, spinach
- Quick to make (<30 min prep+cook)
- Beginner-friendly
```

## Message Length Management

### Preview vs Full Recipe
Recipe text can be 500-800 characters. Strategies:
1. **Show full recipe immediately** - Most useful for user
2. **Offer to save** - Always prompt user to save after generating
3. **Progressive disclosure** - Show nutrition first, then "Say 'show full' for instructions"

### Recommended Format
```
🍳 [Recipe Name]

*Nutrition:*
[Macros]

*Ingredients:*
[List]

*Instructions:*
[Steps]

⏱️ Prep: X min | Cook: Y min

(Say "save this recipe" to add to collection)
```

## Integration with Other Skills

### With recipe-lookup
After generating a recipe:
- Save it to database
- It becomes searchable via recipe-lookup
- Can be retrieved later by name

### With track-nutrition
When logging food:
- Suggest using generated recipe's nutritional data
- Link food log entry to saved recipe ID
- Auto-fill macros from recipe

### With manage-feeds (Aggregator)
When user reads food/recipe article:
- Offer to "generate similar recipe"
- Use article content as inspiration

## Error Handling

- **Gemini API error**: "Could not generate recipe. Please try again."
- **No API key**: "Recipe generation unavailable. Gemini API key not configured."
- **Invalid request**: "Please provide more details: meal type, preferences, or ingredients?"
- **Save failed**: "Could not save recipe to database."

## Advanced Features

### Recipe Variations
```python
prompt = f"""Generate 3 variations of this recipe:
{base_recipe}

Variations should differ in:
1. Protein source (e.g., chicken vs tofu)
2. Cooking method (e.g., grilled vs baked)
3. Cuisine style (e.g., Asian vs Mediterranean)
"""
```

### Scaling Recipes
```python
prompt = f"""Scale this recipe to {servings} servings:

{original_recipe}

Adjust all ingredient quantities proportionally."""
```

### Dietary Substitutions
```python
prompt = f"""Adapt this recipe to be {new_diet_type}:

{original_recipe}

Replace ingredients as needed, maintain similar nutrition."""
```

## Database Schema Reference

```sql
CREATE TABLE saved_recipes (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    recipe_name TEXT NOT NULL,
    recipe_content TEXT NOT NULL,
    dietary_preference TEXT,
    estimated_calories INTEGER,
    estimated_protein_g REAL,
    estimated_carbs_g REAL,
    estimated_fat_g REAL,
    ingredients_used TEXT,
    source_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);
```

## Python Module Reference

```python
import sys
sys.path.append('/workspace/extra/RecipeAdvisor')
from database import (
    save_recipe,           # Save generated recipe
    get_user_profile,      # Get macro targets
    get_user_ingredients,  # Get available ingredients
    add_query_history      # Log generation request
)

from google import genai
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
```

## Important Notes

### Context Awareness
- Remember last generated recipe in session
- When user says "save this" or "that recipe", refer to last generated one
- Track user preferences across conversation

### Nutritional Accuracy
- Gemini provides **estimates**, not exact values
- Encourage users to verify nutrition if critical
- Note that serving sizes affect totals

### API Rate Limits
- Gemini has rate limits (requests per minute)
- Handle rate limit errors gracefully
- Cache recent generations to avoid re-generating same recipe

### User Experience
- Always offer to save after generating
- Show preview of nutrition before full recipe
- Make it easy to regenerate with tweaks
- Link to similar saved recipes if available
