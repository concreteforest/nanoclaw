---
name: add-clear
description: Adds a /clear command that tells the agent to summarize the current conversation, save it to memory, and drop the raw message history to save API tokens and reduce costs.
---

# Add Context Compaction Skill (/clear)

This skill adds the ability to compact a chat's context. When a user types `/clear`, NanoClaw will:
1. Summarize the conversation up to that point.
2. Store the summary in the group's `CLAUDE.md` memory file.
3. Advance the database cursor (`last_agent_timestamp`) so the agent "forgets" the raw messages before the `/clear` command, saving significant API tokens on future requests.

## Implementation

Provide these instructions to Claude Code to apply the skill:

### Step 1: Update src/index.ts to intercept /clear

Find the `processGroupMessages` function in `src/index.ts`. Look for where the `prompt` is created:

```typescript
const prompt = formatMessages(missedMessages);
```

Add interception logic right after it:

```typescript
  let actualPrompt = prompt;
  let isClearCommand = false;

  // Intercept the /clear command
  const hasClear = missedMessages.some(m => m.content.trim().toLowerCase().includes('/clear'));
  if (hasClear) {
    isClearCommand = true;
    actualPrompt = `The user has requested to clear the conversation context using the /clear command.
Your task is to:
1. Write a very concise, bulleted summary of the most important facts, decisions, and context from this conversation so far.
2. Save this summary into this group's CLAUDE.md file using bash tools. Ensure you append it under a "Historical Context" header.
3. Once you have saved it, reply to the user with a short message confirming that the context has been compacted and saved to memory.`;
    
    logger.info({ group: group.name }, 'Intercepted /clear command, triggering compaction');
  }
```

Then, further down in the `processGroupMessages` function, change `prompt` to `actualPrompt` when calling `runAgent`:

```typescript
  const output = await runAgent(group, actualPrompt, chatJid, async (result) => {
```

### Step 2: Ensure the cursor advances

The existing logic in NanoClaw already advances the `lastAgentTimestamp` cursor *before* running the agent:

```typescript
  lastAgentTimestamp[chatJid] = missedMessages[missedMessages.length - 1].timestamp;
  saveState();
```

Because of this, after the agent finishes the summarize-and-save task triggered by `/clear`, all subsequent messages will naturally start *after* the `/clear` command. The old raw messages are left behind in the database, but are no longer fetched into the context window!

### Step 3: Rebuild and Restart

```bash
npm run build
# Restart service (e.g., systemctl --user restart nanoclaw)
```

## Usage

In any registered chat (WhatsApp or Telegram), simply send:
`@Andy /clear` (or whatever your trigger word is).

The bot will pause, generate a summary, save it to `CLAUDE.md`, and reply that the context is cleared. From then on, your API requests will be significantly cheaper because the massive backlog of text is no longer being appended to every prompt.
