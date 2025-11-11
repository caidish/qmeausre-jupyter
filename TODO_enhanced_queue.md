# Enhanced Queue Functionality – Technical Plan

## Idea 1: Loop Blocks (Repeated Sweeps)

### Overview
Allow users to wrap one or more queue entries inside a loop (repeat N times, or iterate over a list of values). The queue UI will display loop blocks, and the exporter will emit Python `for` loops around the child sweeps.

### Data Model
- Update `QueueEntry` (in `src/types/queue.ts`) to support a new `queueType` (e.g., `"sweep"` | `"function"` | `"loop"`).
- Define an interface for loop entries:
  ```ts
  interface QueueLoopEntry {
    id: string;
    queueType: 'loop';
    label: string;                 // e.g., "Repeat 5 times" or "For each setpoint"
    loopKind: 'repeat' | 'values'; // repeat => count, values => array
    count?: number;                // for repeat loops
    values?: string[];             // raw strings representing Python expressions
    body: QueueEntry[];            // nested entries to execute within loop
    createdAt: number;
    modifiedAt: number;
  }
  ```
- Extend `QueueState.entries` to allow nested structures (either flatten to list with parent pointers or transform the store to support tree data).

### Queue Store Updates (`src/queue/queueStore.ts`)
- Add actions: `addLoop(loopEntry)`, `updateLoop(id, patch)`, `addToLoop(loopId, entry)`, `removeFromLoop(loopId, entryId)`, `moveWithinLoop`.
- Consider representing the entire queue as a tree (`QueueEntry | QueueLoopEntry` union) to simplify nesting. Adjust consumers (`useQueueStore`) accordingly.

### Sweep Manager Integration (`src/components/SweepManager.tsx`)
- Add “Add to Loop” option:
  - When user clicks “Add to Queue”, show a modal: choose existing loop or direct queue.
  - Provide UI to create a new loop entry (specify repeat count or value list, label).
- When editing a sweep inside a loop, ensure `selectedId` encodes both loop id and entry id (e.g., `loopId:entryId`). Update hydration logic accordingly.

### Queue Manager UI (`src/queue/QueueManager.tsx`)
- Render loop entries with accordion-style nested lists:
  - Show loop header with label and controls (edit, duplicate, delete).
  - Indent child entries with visual grouping.
  - Provide buttons to add sweeps/functions directly inside loop body.
  - Reorder entries both within loop and across loops (drag-and-drop; consider using `react-beautiful-dnd` with nested lists).
- Implement edit modal for loop settings (change repeat count or values).

### Exporter (`src/queue/export.ts`)
- Update export logic to recursively traverse entries:
  ```python
  def export(entries):
      for entry in entries:
          if entry.queueType == 'loop':
              if entry.loopKind == 'repeat':
                  sections.append(f"for i_{id} in range({entry.count}):")
              else:
                  list_expr = ", ".join(entry.values)
                  sections.append(f"for value_{id} in [{list_expr}]:")
              with increased indentation:
                  export(entry.body)
          elif entry.queueType == 'sweep':
              # current logic (emit setup, queue append)
          elif entry.queueType == 'function':
              # see Idea 2
  ```
- For value-based loops, allow parameter substitution in child sweeps:
  - Define placeholder syntax in form UI (e.g., user enters `{value}` in sweep parameters).
  - During export, replace `{value}` with the loop variable.

### Developer Notes
- Decide on indentation strategy (e.g., maintain `currentIndent` string while building sections).
- Ensure loops preserve database configuration and deferred start. Wrap DB entries inside loops as needed.
- Update tests (`tests/test_queue.md`) with scenarios for loop entries (export script containing `for` loops).

## Idea 2: Function/Callback Entries (Parser/Panel Integration Ready)

### Overview
Support queue entries that are arbitrary Python functions or callables (e.g., pause, custom instrumentation actions) inserted between sweeps. MeasureIt’s `SweepQueue.append` already accepts callables, so we simply need to expose them in the UI/exporter.

### Data Model
- Extend `QueueEntry` union with:
  ```ts
  interface QueueFunctionEntry {
    id: string;
    queueType: 'function';
    label: string;          // e.g., "Custom Pause"
    pythonCode: string;     // body to execute
    createdAt: number;
    modifiedAt: number;
  }
  ```
- Optionally support predefined templates (e.g., Pause 10s, Flush DB) via a `templateId` field.

### Queue Store / UI
- Add “Add Function” button in Queue Manager:
  - Opens dialog with text area for Python code or selection of templates.
- Display function entries with distinct icon (⚙️) and actions (edit, duplicate, delete).
- Allow functions inside loops (reuse the nested structure from Idea 1).

### Sweep Manager Integration
- Provide an “Add Function” button near queue controls that opens the function dialog (or integrate within Queue Manager only).

### Exporter (`src/queue/export.ts`)
- When encountering `queueType === 'function'`:
  - Emit a uniquely named function before queue construction:
    ```python
    def _func_{id}():
        # indented user-provided pythonCode
    sq.append(_func_{id})
    ```
  - Alternatively, inline as lambda if single-line and safe.
- Ensure multi-line code is indented properly; store the snippet exactly as the user typed.

### Validation & Safety
- Consider wrapping user code in `try/except` when running to prevent queue interruption.
- For templates, provide parameterized inputs (e.g., “Pause (seconds)”).

### Documentation & Testing
- Update user docs describing how to create loops and function entries, including placeholder syntax.
- Extend automated exporter tests to cover loops and function entries.
- Add manual QA steps: build queue with loop + function, export, execute in MeasureIt environment.
- Coordinate with Phase 5 parser/details work:
  - Add markers (comments or IDs) so `parser.ts` can tie queue entries to TOC/Details Panel.
  - Details panel should display loop/function context (position, DB info) when available.
