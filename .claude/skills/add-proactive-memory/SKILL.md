---
name: add-proactive-memory
description: Adds a Write-Ahead Log (WAL) and Working Buffer to the agent's memory, ensuring the agent can reason reliably and maintain state across sessions without bloating the standard context window.
---

# Add Proactive Memory Skill

This skill injects the concepts of a Working Buffer and a Write-Ahead Log (WAL) into NanoClaw. 

## Objectives

1. Create a dynamic Working Buffer that is injected directly into the system prompt upon spinning up an agent.
2. Teach the agent to reason inside `<wal>` tags, which are stripped from the final user output.

## Implementation Steps

### Step 1: Inject Buffer into Context
In `container/agent-runner/src/index.ts`, locate where `globalClaudeMd` is built. Read `/workspace/group/buffer.txt` (if it exists) and append its contents to `globalClaudeMd` so the agent is immediately aware of its current working state.

### Step 2: Establish the Proactive Instructions
In `container/agent-runner/src/index.ts`, append a system prompt instruction to `globalClaudeMd` instructing the agent on using `<wal>` tags to record its reasoning and plans before taking actions, and encouraging the use of `echo` to write to `buffer.txt`.

### Step 3: Extract `<wal>` tags from output
In `src/index.ts`, locate where `runAgent` processes the agent output (around string replacement for `<internal>`). Add logic to also match and strip `<wal>...</wal>` tags so they don't pollute WhatsApp/Telegram.
