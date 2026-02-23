# Intent for `container/agent-runner/src/index.ts`

**What changed:**
1. Added `spawn` to the `child_process` imports.
2. Modified the `MODEL_ALIASES` map to include `gemini-2.5-flash` and `gemini-3`.
3. In the main function, before resolving the initial prompt loop, added logic to detect if the selected model is `gemini` and if the `GOOGLE_API_KEY` exists.
4. If so, spin up a local proxy bypassing the IT LiteLLM instance via a `uvx litellm` command and routing requests to `http://127.0.0.1:<port>`.

**Invariants:**
- `uvx litellm` sidecar MUST be used for Gemini models because the Anthropic Agent SDK hard-codes anthropic API formats.
- The IT-provided `ANTHROPIC_BASE_URL` MUST be bypassed if a generic `GOOGLE_API_KEY` is detected.
