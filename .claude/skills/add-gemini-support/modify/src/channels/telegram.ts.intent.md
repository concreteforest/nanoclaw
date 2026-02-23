# Intent for `src/channels/telegram.ts`

**What changed:**
Added `gemini-2.5-flash` and `gemini-3` strings to `validModels` array in the `/model` telegram query action block.

**Invariants:**
- Users must be able to swap out Claude models context to local proxy Google Gemini models using `/model gemini-2.5-flash` dynamically.
