# NanoClaw Update Documentation (Feb 2026)

This document summarizes the recent major updates to the NanoClaw repository, including an upstream sync and three brand-new custom features. Please review this to understand the current architecture and capabilities of the agent runner, host pipeline, and database schema.

## 1. Upstream Base Sync (`qwibitai/nanoclaw`)
We recently pulled the latest changes from the official upstream repository and completed extensive merge conflict resolutions to preserve custom Telegram/VPS logic:
- **Container Runtime Agnostic**: `container/build.sh` and `src/container-runner.ts` now support dynamic container runtimes (e.g., Docker, Apple Container) via `CONTAINER_RUNTIME_BIN` and `readonlyMountArgs`.
- **WhatsApp Voice Transcriptions**: Voice messages are now correctly transcribed and populated to the `content` field *before* text continuity logic runs in `src/channels/whatsapp.ts`.
- **Group Metadata Adjustments**: Refinements to how `onChatMetadata` passes flags downstream.

## 2. Proactive Memory Skill (Working Buffer + WAL)
We implemented the `.claude/skills/add-proactive-memory` skill to allow the agent to manage long-term state effectively without wasting tokens:
- **Working Buffer**: The container injects the contents of `/workspace/group/buffer.txt` (if present) into the agent's system prompt (in `container/agent-runner/src/index.ts`).
- **Write-Ahead Log (WAL)**: The system prompt instructs the agent to wrap intensive reasoning in `<wal>...</wal>` XML tags.
- **Output Stripping**: The orchestrator (`src/index.ts`) sanitizes all outbound messages by stripping `<wal>` and `<internal>` tags, ensuring internal reasoning isn't sent to chat interfaces.

## 3. Structured Ontology Memory Skill (Knowledge Graph)
We implemented the `.claude/skills/add-ontology-memory` skill to give the agent a structured relational knowledge base directly tied to SQLite.
- **SQLite Schema Changes**: Added `entities` and `relations` tables to `src/db.ts` to store nodes (e.g., "Person", "Concept") and their connections (e.g., "knows", "has_skill").
- **MCP IPC Tools**: Registered `create_entity`, `link_entities`, and `query_ontology` inside the containerized stdio MCP server (`container/agent-runner/src/ipc-mcp-stdio.ts`).
- **Host Dispatchers**: Added event handlers in `src/ipc.ts` that intercept ontology requests, perform database actions using `src/memory.ts`, and pass query results back into the container asynchronously via JSON response files.

## 4. Service Watchdog & Health Tracking
To prevent Node.js event loop freezing on the VPS without active intervention:
- **Heartbeat Check**: The main polling loop inside `src/index.ts` now executes a raw `fs.writeFileSync('.health', Date.now().toString())` operation on every run cycle.
- **Watchdog Script**: A new script `scripts/install-watchdog.sh` was built. When executed on the VPS, it binds a cron job (`watchdog.sh`) that checks if the `.health` file's modified time exceeds 5 minutes (300 seconds). If stale, it logs the freeze to `watchdog.log` and executes `systemctl --user restart nanoclaw` to auto-recover the service.

## Instructions for Deploying & Debugging (VPS)
- **Deployment**: After pulling the code (`git pull origin main`), you must re-run `npm run build` so that the custom IPC translation code compiles correctly. Then, run `sh scripts/install-watchdog.sh` to secure the supervisor heartbeat.
- **Architectural Awareness**: Claude should note that the core database connection variable `db` is now exported in `src/db.ts` and actively utilized by the new `src/memory.ts` driver. The container boundary passes tool calls (MCP protocol) through JSON files dropped in `data/ipc/*/tasks/`.
- **Troubleshooting**: If you need to debug service drop-outs or process freezing, check the `watchdog.log` residing in the project root or verify the write permissions of the zero-byte `.health` heartbeat file.
