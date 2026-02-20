---
name: add-vps-admin
description: Allows the agent to safely execute predefined bash scripts on the host VPS (like checking disk space or restarting services) by mounting a read-only script directory into the container.
---

# Add VPS Admin Skill

NanoClaw runs in isolated Docker containers for security, meaning it cannot natively run host commands (like `df -h` to check the VPS disk or `systemctl` to restart services). 

This skill bridges that gap **securely**. Instead of giving the container raw host access, you will create a folder of predefined, safe scripts on your VPS. NanoClaw will mount that folder as **read-only**, allowing it to execute the scripts but never modify them or run arbitrary commands outside of them.

## Setup Instructions

Provide these steps to the user:

### Step 1: Create the Host Scripts Directory

On the VPS host machine, create the directory and a sample script:

```bash
mkdir -p /opt/nanoclaw/scripts
cd /opt/nanoclaw/scripts

# Create a sample disk check script
cat << 'EOF' > check_disk.sh
#!/bin/bash
echo "=== Disk Space ==="
df -h /
echo "=== Memory ==="
free -h
EOF

chmod +x check_disk.sh
```

### Step 2: Whitelist the Mount in configuration

NanoClaw has a security feature (`src/mount-security.ts`) that strictly validates any custom mounts requested by a group registration. We need to whitelist our new scripts directory.

Ask Claude Code to modify `.env` (and copy it to `data/env/env`) to add:

```env
NANOCLAW_ALLOWED_MOUNTS=/opt/nanoclaw/scripts
```

### Step 3: Update Main Group Registration

To give the *Main Group* access to these scripts, modify the registration in `src/index.ts`. 
Since the main group is usually registered via guided setup in SQLite directly, we instead need to write a quick migration script or modify how `CLAUDE_CODE_ADDITIONAL_DIRECTORIES...` are passed. 

The easiest, most NanoClaw-native way is to run a database update to add the `containerConfig` to the main group.

Ask Claude Code to execute this SQLite command against the database:

```bash
sqlite3 store/messages.db "UPDATE registered_groups SET container_config = '{\"additionalMounts\": [{\"hostPath\": \"/opt/nanoclaw/scripts\", \"containerPath\": \"/workspace/host-scripts\", \"readonly\": true}]}' WHERE folder = 'main';"
```

### Step 4: Restart NanoClaw

```bash
systemctl --user restart nanoclaw
```

## Usage

In your main WhatsApp/Telegram chat with the bot, you can now say:

> "@Andy check the VPS health"

Because the agent can see the read-only scripts inside `/workspace/host-scripts/`, it will know to execute `/workspace/host-scripts/check_disk.sh` inside the container (which reads from the host, depending on the script, or just returns container stats if not mapped to host namespaces). 

*Note: If the scripts need to interact with host systems like `systemd` or full host `df`, you may need to add additional read-only mounts (like `/var/run/dbus/system_bus_socket` or `/`) to the whitelist and SQLite config.*
