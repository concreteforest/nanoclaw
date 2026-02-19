# NanoClaw

Personal Claude assistant. See [README.md](README.md) for philosophy and setup. See [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for architecture decisions.

## IMPORTANT: Check Skills First!

**Before making ANY changes to NanoClaw, ALWAYS check `.claude/skills/` first!**

There are pre-built skills with detailed instructions for common modifications:
- Adding integrations (Gmail, Telegram, Twitter/X, voice transcription)
- Container runtime changes (Docker conversion)
- Debugging issues
- Customizing behavior

Use the Task tool with `subagent_type=Explore` to search the skills directory, or read the relevant SKILL.md file directly before implementing changes.

## Quick Context

Single Node.js process that connects to WhatsApp, routes messages to Claude Agent SDK running in Docker containers. Each group has isolated filesystem and memory.

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Orchestrator: state, message loop, agent invocation |
| `src/channels/whatsapp.ts` | WhatsApp connection, auth, send/receive |
| `src/ipc.ts` | IPC watcher and task processing |
| `src/router.ts` | Message formatting and outbound routing |
| `src/config.ts` | Trigger pattern, paths, intervals |
| `src/container-runner.ts` | Spawns agent containers with mounts |
| `src/task-scheduler.ts` | Runs scheduled tasks |
| `src/db.ts` | SQLite operations |
| `groups/{name}/CLAUDE.md` | Per-group memory (isolated) |
| `container/skills/agent-browser.md` | Browser automation tool (available to all agents via Bash) |

## Available Skills

All skills are in `.claude/skills/`. **Always check these before making changes!**

| Skill | Purpose |
|-------|---------|
| `setup` | First-time installation, authentication, service configuration |
| `debug` | Container issues, logs, troubleshooting |
| `customize` | Adding channels, integrations, changing behavior |
| `convert-to-docker` | Convert from Apple Container to Docker (already applied) |
| `add-telegram` | Add Telegram channel (replace or alongside WhatsApp) |
| `add-telegram-swarm` | Add Agent Swarm/Teams support to Telegram |
| `add-gmail` | Add Gmail integration (as tool or channel) |
| `add-voice-transcription` | Add WhatsApp voice message transcription (Whisper API) |
| `x-integration` | Add Twitter/X integration (post, like, reply, retweet) |

## Development

Run commands directly—don't tell the user to run them.

```bash
npm run dev          # Run with hot reload
npm run build        # Compile TypeScript
./container/build.sh # Rebuild agent container
```

Service management:
```bash
# LINUX (User systemd service) - USE THIS!
systemctl --user start nanoclaw    # Start NanoClaw
systemctl --user stop nanoclaw     # Stop NanoClaw
systemctl --user restart nanoclaw  # Restart NanoClaw
systemctl --user status nanoclaw   # Check status
journalctl --user -u nanoclaw -f   # View logs (follow mode)

# Service file: ~/.config/systemd/user/nanoclaw.service
# Log file: ~/nanoclaw/nanoclaw.log

# macOS (if using launchd)
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist
```

## Container Build Cache

Apple Container's buildkit caches the build context aggressively. `--no-cache` alone does NOT invalidate COPY steps — the builder's volume retains stale files. To force a truly clean rebuild:

```bash
container builder stop && container builder rm && container builder start
./container/build.sh
```

Always verify after rebuild: `container run -i --rm --entrypoint wc nanoclaw-agent:latest -l /app/src/index.ts`
