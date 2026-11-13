#!/bin/bash
PLIST_PATH="$HOME/Library/LaunchAgents/com.roku.channelguide.plist"
if [ -f "$PLIST_PATH" ]; then
    launchctl unload "$PLIST_PATH" 2>/dev/null
    rm -f "$PLIST_PATH"
    echo "Service stopped and removed."
else
    echo "No service was registered."
fi
