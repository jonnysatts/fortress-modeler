#!/bin/bash

echo "🔄 Restarting Claude Code to refresh agent registry..."
echo ""
echo "Steps to restart Claude Code:"
echo "1. Save any work in progress"
echo "2. Quit Claude Code completely (Cmd+Q)"
echo "3. Wait 5 seconds"
echo "4. Reopen Claude Code"
echo "5. Navigate back to /Applications/fortress-modeler-cloud"
echo "6. Try using agents again"
echo ""
echo "After restart, test with:"
echo '  Task("Backend audit", subagent_type="backend-reliability-engineer")'
echo ""
echo "If agents still aren't recognized, try:"
echo "  - Clear Claude Code cache: rm -rf ~/Library/Caches/com.anthropic.claude-code"
echo "  - Check for updates to Claude Code"
