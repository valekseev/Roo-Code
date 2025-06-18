# VSIX Package Details

## Version: 3.20.3-v6

Built on: 2025-01-16 19:45:00 UTC

## Key Changes in v6:

- **Changed +5m to +10m button** for longer timeout extensions
- **Fixed color transitions**: Red at 5 seconds, orange at 20 seconds, blue above 20 seconds
- **Fixed timeout bar disappearing issues**: Bar now clears when tasks complete or are cancelled
- **Improved timeout management**: Added task completion and abortion listeners to clear timeouts
- Debug indicator updated to show "🚀 Roo Code v6 - Ready for timeout testing"

## All Features:

- Always-visible +1m, +10m, X buttons (no warning condition required)
- No percentage display in timeout progress bar
- Smooth color transitions based on remaining time (not percentage)
- Automatic timeout clearing when tasks finish or are manually cancelled
- Progress bar should continue smoothly during extensions (startTime preserved)

## Bug Fixes:

- Timeout bars now disappear when clicking "Close this task and start a new one"
- Timeout bars disappear when tasks complete without timeout
- Added clearAllSubtaskTimeouts() method for comprehensive cleanup
- Task completion and abortion events now properly clear timeouts

## Installation:

```bash
# Navigate to the bin directory
cd /home/ubuntu/src/Roo-Code/bin

# Install the extension
code --install-extension roo-cline-3.20.3-v6.vsix
```

## Testing:

1. Look for blue debug message "🚀 Roo Code v6 - Ready for timeout testing" in task header
2. Create a subtask with timeout_seconds parameter
3. Verify timeout counter shows with +1m, +10m, X buttons
4. Test color changes: blue → orange at 20s → red at 5s
5. Test timeout extensions don't reset progress bar
6. Test timeout bar disappears when task completes or is cancelled
7. Check console logs for debugging information
