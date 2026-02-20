---
name: add-sys-monitor
description: Registers a daily scheduled task that asks the agent to run a system check script and send a "Good Morning" briefing to your main chat.
---

# Add System Monitor Skill

This skill utilizes the `task-scheduler` inside NanoClaw to wake the agent up every morning at 8:00 AM. 
The agent will execute a read-only script (enabled by the `add-vps-admin` skill) to check CPU and Disk space, and then message you a brief summary.

## Prerequisites
- The `/add-vps-admin` skill must be enabled so the agent can run host-level scripts securely.

## Setup Instructions

Provide these steps to the user:

### Step 1: Create the System Info Script

On the host VPS, run:

```bash
mkdir -p /opt/nanoclaw/scripts

cat << 'EOF' > /opt/nanoclaw/scripts/sysinfo.sh
#!/bin/bash
echo "CPU Load:"
uptime | awk -F'load average:' '{ print $2 }'
echo "Disk Space (Root):"
df -h / | tail -1
echo "Memory Available:"
free -m | grep Mem | awk '{print $4 " MB"}'
EOF

chmod +x /opt/nanoclaw/scripts/sysinfo.sh
```

### Step 2: Add the Scheduled Task to the Database

You need to inject the task into the SQLite database. Ask Claude Code or run this directly via the Host terminal:

```bash
# Note: You need to set YOUR_MAIN_JID to your actual WhatsApp or Telegram chat JID. 
# You can find it by looking at the `chats` table.
MAIN_JID="your_telegram_or_whatsapp_id_here"

sqlite3 store/messages.db "INSERT INTO scheduled_tasks (id, group_folder, chat_jid, prompt, schedule_type, schedule_value, context_mode, status, created_at)
VALUES (
  'daily-sys-briefing',
  'main',
  '${MAIN_JID}',
  'Run the bash script at /workspace/host-scripts/sysinfo.sh. Summarize the output in exactly two sentences, starting with \"Good morning!\"',
  'cron',
  '0 8 * * *',
  'group',
  'active',
  datetime('now')
);"
```

### Step 3: Verify the Task Loaded

No restart is necessary; NanoClaw's scheduler loop pulls from the SQLite database dynamically.
You can ping the bot on WhatsApp/Telegram with:

> `@Andy list my active scheduled tasks`

It will read the `scheduled_tasks` database and confirm the morning briefing is queued.

## How It Works

Because the `context_mode` is set to `'group'`, the container will boot with access to the main group's `CLAUDE.md` and IPC. It will execute the predefined script securely, read the stdout, format a nice good morning message, and pipe it out to your chat. 
If the disk is getting full, Claude will notice its size and warn you automatically.
