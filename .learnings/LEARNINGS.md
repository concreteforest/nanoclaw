# Learning Log

Capture insights, corrections, and discoveries for continuous improvement.

## Format

```markdown
## LEARN-YYYYMMDD-XXX
**Priority:** [low|medium|high|critical]
**Status:** [pending|in_progress|resolved|promoted]
**Area:** [backend|frontend|infra|tests|docs|config]
**Timestamp:** YYYY-MM-DD HH:MM:SS

**Summary:** Brief one-line description

**Context:**
Detailed explanation of what was learned.

**Action:**
How this learning should be applied going forward.

**Related:** [Links to related entries]
```

---

## Example Entry

## LEARN-20260223-001
**Priority:** medium
**Status:** promoted
**Area:** docs
**Timestamp:** 2026-02-23 03:58:00

**Summary:** WhatsApp formatting preferences documented

**Context:**
User prefers clean, readable formatting in WhatsApp messages:
- Use single asterisks for *bold* (not double)
- Use bullets (•) over numbered lists
- Avoid markdown headings (##)
- Keep messages concise and scannable

This applies to all messaging app outputs (WhatsApp, Telegram, etc.)

**Action:**
Updated CLAUDE.md with WhatsApp formatting guidelines. Apply these preferences
by default for all chat messages.

**Related:** None

---

## LEARN-20260224-001
**Priority:** critical
**Status:** resolved
**Area:** backend
**Timestamp:** 2026-02-24 04:56:00

**Summary:** Session ID collisions between groups caused corrupted agent state

**Context:**
Claude Code SDK deterministically derives project names from the workspace path (`cwd` option). NanoClaw was mounting all groups to `/workspace/group`, causing all groups to share the same session ID. When one group had an error, resuming the session in another group would load the corrupted state as the first message, causing repeated failures.

**Root Cause:**
- `container-runner.ts` mounted all groups to hardcoded `/workspace/group` path
- `agent-runner.ts` used hardcoded `/workspace/group` in query options
- Claude Code SDK cached sessions by derived project name, not by JID
- Session resume would load any corrupted history from the shared session

**Solution (RESOLVED):**
1. Modified `container-runner.ts:buildVolumeMounts()` to use unique paths per group:
   - Changed from: `/workspace/group`
   - Changed to: `/workspace/group-${group.folder}`

2. Modified `agent-runner.ts` to use dynamic workspace path:
   - Added `workspacePath = /workspace/group-${containerInput.groupFolder}` at start of `runQuery()`
   - Updated query `cwd` option to use `workspacePath`
   - Updated `buffer.txt` path to use `workspacePath`
   - Updated `createPreCompactHook()` to accept groupFolder for archive paths

3. Verified with docker inspect that containers now mount `/workspace/group-{folder}` paths

**Action:**
If session ID issues occur again:
1. Check container mounts: `docker inspect <container-name> --format='{{json .Mounts}}'`
2. Verify each group has unique `/workspace/group-*` path
3. If not, check that both container-runner.ts AND agent-runner.ts changes are deployed
4. Rebuild TypeScript: `npm run build`
5. Rebuild container: `./container/build.sh`
6. Restart NanoClaw: `systemctl --user restart nanoclaw`

**Related:** Session initialization logic, group isolation, container mounting

---

<!-- Add new entries below -->

## LEARN-20260223-002
**Priority:** medium
**Status:** pending
**Area:** infra
**Timestamp:** 2026-02-23 04:01:13

**Summary:** Self-improving-agent skill successfully installed

**Context:**
Implemented the self-improving-agent skill from OpenClaw for NanoClaw. Created .learnings/ directory with ERRORS.md, LEARNINGS.md, and FEATURE_REQUESTS.md. Added helper functions and updated CLAUDE.md with self-improvement guidelines.

**Action:**
Use this system to log errors, learnings, and feature requests going forward. Review pending items weekly and promote valuable learnings to CLAUDE.md.

**Related:** None

---
