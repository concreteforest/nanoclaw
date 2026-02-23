# Intent for `src/index.ts`

**What changed:**
Updated the model prefix regex in `runAgent()` from `(haiku|sonnet|opus)` to `(haiku|sonnet|opus|gemini-2\.5-flash|gemini-3)`.

**Invariants:**
- Users must be able to use "use gemini-2.5-flash: " or "with gemini-3: " to dynamically select the Gemini models in their prompts.
