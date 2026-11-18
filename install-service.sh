#!/bin/bash
set -e

PLIST_PATH="$HOME/Library/LaunchAgents/com.roku.channelguide.plist"
NODE_PATH="$(which node)"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNTIME_DIR="$HOME/.roku-channel-guide"

mkdir -p "$RUNTIME_DIR/logs" "$HOME/Library/LaunchAgents"

# macOS TCC blocks launchd agents from reading ~/Documents (EPERM).
# Stage runtime copy under ~/.roku-channel-guide so launchd can run 24/7 cleanly.
rsync -a --delete \
  --exclude '.git' \
  --exclude 'ios' \
  --exclude 'logs' \
  "$SRC_DIR/" "$RUNTIME_DIR/"

cat << PLIST > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.roku.channelguide</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$RUNTIME_DIR/server/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$RUNTIME_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$RUNTIME_DIR/logs/server.log</string>
    <key>StandardErrorPath</key>
    <string>$RUNTIME_DIR/logs/server.error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
PLIST

launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"
echo "✅ Roku Channel Guide launchd service registered and started from $RUNTIME_DIR!"
