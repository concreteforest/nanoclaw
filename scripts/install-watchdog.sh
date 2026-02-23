#!/bin/bash

# Define directories and files
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HEALTH_FILE="$PROJECT_DIR/.health"
WATCHDOG_SCRIPT="$PROJECT_DIR/scripts/watchdog.sh"

# Create the watchdog check script
cat << 'EOF' > "$WATCHDOG_SCRIPT"
#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HEALTH_FILE="$PROJECT_DIR/.health"

if [ ! -f "$HEALTH_FILE" ]; then
  # No health file exists yet, give it time
  exit 0
fi

# Get the last modification time of the .health file in seconds since epoch
LAST_UPDATED=$(stat -c %Y "$HEALTH_FILE" 2>/dev/null || stat -f %m "$HEALTH_FILE")
CURRENT_TIME=$(date +%s)
TIME_DIFF=$((CURRENT_TIME - LAST_UPDATED))

# If file hasn't been updated in 300 seconds (5 minutes)
if [ "$TIME_DIFF" -gt 300 ]; then
  echo "$(date): NanoClaw process frozen. .health file stale by ${TIME_DIFF}s. Restarting service..." >> "$PROJECT_DIR/watchdog.log"
  systemctl --user restart nanoclaw
fi
EOF

chmod +x "$WATCHDOG_SCRIPT"

# Add the cron job
CRON_CMD="* * * * * $WATCHDOG_SCRIPT"
(crontab -l 2>/dev/null | grep -v "$WATCHDOG_SCRIPT"; echo "$CRON_CMD") | crontab -

echo "Watchdog installed successfully."
echo "It checks .health every minute and restarts nanoclaw.service if stale > 5 minutes."
