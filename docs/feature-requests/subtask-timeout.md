# Feature Request: Subtask Timeout for `new_task` Tool

## 1. What specific problem does this solve?

When Roo Code runs automated workflows using less capable models (for example during SWE-bench style evaluations), subtasks created with the `new_task` tool can enter endless edit loops. Without a timeout the parent task remains paused indefinitely, which blocks the evaluation and wastes compute time.

## 2. How should this be solved?

Add an optional `timeout_seconds` parameter to the `new_task` tool. When specified, the spawned subtask automatically stops after the given number of seconds and returns the partial result to the parent task. The parent continues execution instead of waiting forever. Existing behaviour is unchanged when the parameter is omitted.

## 3. How will we know it works?

- **Given** a subtask is created with `timeout_seconds: 10`
- **When** the subtask runs longer than 10 seconds
- **Then** it is cancelled and control returns to the parent task with a timeout message
- **And** if the subtask completes within 10 seconds, the timeout does not trigger
- **But** normal tasks without the parameter continue to run without timeouts

## 4. Technical considerations

- Implementation adds a timer in `newTaskTool` that calls `stop()` on the spawned task after the timeout.
- Needs to handle cleanup so timers are cleared when the subtask finishes.
- Timeout should not interfere with checkpoints or mode switching logic.
- Must ensure compatibility with existing provider APIs and orchestration logic.

## 5. Trade-offs and risks

- Selecting an incorrect timeout value may terminate tasks prematurely.
- Additional timers could slightly increase memory usage if many subtasks run concurrently.
- Alternatives like a global timeout or provider-based enforcement were considered but would be harder to tune for specific subtasks.
