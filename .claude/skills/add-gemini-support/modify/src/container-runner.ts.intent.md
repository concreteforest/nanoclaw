# Intent for `src/container-runner.ts`

**What changed:**
1. Appended `GOOGLE_API_KEY` to the keys retrieved by `readSecrets()`. 
2. Mounted `~/.cache/uv` from host memory into the container so `uvx litellm` downloads caching hits rapidly on secondary runs.

**Invariants:**
- `GOOGLE_API_KEY` secrets MUST NOT touch disk. They must be sent directly via STDIN into the container agent-runner SDK instance securely alongside Anthropic auth keys.
