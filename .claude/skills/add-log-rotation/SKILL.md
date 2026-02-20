---
name: add-log-rotation
description: Adds a scheduled task to safely prune old container logs (older than 7 days) without affecting agent memory or SQLite databases. Essential for VPS deployments with limited disk space.
---

# Add Log Rotation Skill

This skill adds a daily scheduled task to NanoClaw to prune old Docker/Apple Container debug logs from `groups/*/logs/`. 

It is 100% safe for agent memory: it deliberately ignores `CLAUDE.md` and the `messages.db` SQLite file, ensuring the agent never forgets a conversation.

## Implementation

Provide the following instructions to the user/Claude Code:

1. **Modify `src/index.ts`** to add a new startup routine that registers a global scheduled task for log rotation.

Find the `main()` function in `src/index.ts`. Before the call to `startMessageLoop();`, add a call to `ensureLogRotationTask();`.

2. **Create the `ensureLogRotationTask()` function** in `src/index.ts`:

```typescript
import { createTask, getTaskById } from './db.js';
import { ASSISTANT_NAME, MAIN_GROUP_FOLDER } from './config.js';

// ... other imports ...

function ensureLogRotationTask(): void {
  const taskId = 'global-log-rotation';
  const existingTask = getTaskById(taskId);
  
  if (!existingTask) {
    logger.info('Registering global log rotation task');
    createTask({
      id: taskId,
      group_folder: MAIN_GROUP_FOLDER,
      chat_jid: 'local:system', // Internal JID so it doesn't message a real chat unless it errors
      prompt: `Please run a bash script to find and delete all files in the groups/*/logs/ directories that are older than 7 days. DO NOT touch CLAUDE.md or store/messages.db. Only delete files ending in .log. Return a brief summary of how many files were deleted.`,
      schedule_type: 'cron',
      schedule_value: '0 3 * * *', // Run at 3:00 AM every day
      status: 'active',
      next_run: new Date(Date.now() + 60000).toISOString(), // Run soon after startup the first time
      created_at: new Date().toISOString(),
      context_mode: 'isolated'
    });
  }
}
```

3. **Rebuild the project**

```bash
npm run build
```

4. **Restart the service**

```bash
# If using launchd on macOS
launchctl kickstart -k gui/$(id -u)/com.nanoclaw

# If using systemd on Linux
systemctl --user restart nanoclaw
```

## How It Works

Once a day at 3:00 AM, the NanoClaw task scheduler will spin up an isolated agent container for the main group. 
Because the main group has the entire project mounted at `/workspace/project`, the agent can safely run a `find` command strictly inside the `logs/` subdirectories to prune old `.log` files. 

Since it uses the standard agent execution flow, any errors in the deletion process will be logged gracefully in the `task_run_logs` table.
