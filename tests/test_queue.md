# Queue Infrastructure Test Guide

Phase 1 of the queue work delivers the queue store, Python exporter, and command
for inserting queue scripts. Use the checks below to verify everything end-to-end.

---

## What Landed in Phase 1
1. **Types** – `src/types/queue.ts`
   - `QueueEntry`, `DatabaseConfig`, `QueueState`.
2. **Store** – `src/queue/queueStore.ts`
   - Singleton with actions (`addOrReplace`, `remove`, `move`, `clear`, `select`) and a React hook.
3. **Exporter** – `src/queue/export.ts`
   - `exportSweepQueue` (queue script) and `exportSingleEntry`.
4. **Command** – `src/plugin.ts`
   - `qmeasure:insert-queue` command injects queue code into the active notebook.

---

## Manual Tests

### 1. Queue store operations
Run in the JupyterLab browser console (after `jlpm build`). Because JupyterLab 4 uses ES modules, load the compiled bundle with `await import(...)`.

```javascript
const { getQueueStore } = await import('/files/qmeausre-jupyter/lib/queue/queueStore.js?cacheBust=' + Date.now());
const store = getQueueStore();

const entryA = {
  id: 'sweep-1',
  name: 'Test Sweep 1D',
  sweepType: 'sweep1d',
  code: {
    setup: 'set_param = station.test\ns_1D = Sweep1D(set_param, 0, 10, 1)',
    start: 'ensure_qt()\ns_1D.start()',
  },
};

store.addOrReplace(entryA);
console.log('after add', store.getEntries());

// Update the same entry – createdAt should stay the same, modifiedAt should change.
store.addOrReplace({ ...entryA, name: 'Updated Sweep 1D' });
const [updated] = store.getEntries();
console.log('timestamps', updated.createdAt, updated.modifiedAt);

// Add a second entry and test reordering (including drop-at-end case).
store.addOrReplace({
  id: 'sweep-2',
  name: 'Sweep 2D',
  sweepType: 'sweep2d',
  code: { setup: '# dummy', start: '# dummy' },
});
store.move(0, store.getEntries().length);   // should place sweep-1 at the end
console.log('order after move', store.getEntries().map(e => e.id));

store.remove('sweep-1');
store.clear();
console.log('final entries', store.getEntries());
```

> ✅ Expect `createdAt` to remain constant across updates, `modifiedAt` to change, and `move()` to accept `toIndex === entries.length`.

### 2. Python exporter
Run inside a Node REPL or Jest test (Paths are relative to repo root):

```ts
import { exportSweepQueue } from './src/queue/export';
import { QueueEntry } from './src/types/queue';

const entries: QueueEntry[] = [
  {
    id: '1',
    name: 'Sweep 1D',
    sweepType: 'sweep1d',
    code: {
      setup: 'set_param = station.magnet.field\ns_1D = Sweep1D(set_param, 0, 5, 0.1)',
      start: 'ensure_qt()\ns_1D.start()',
    },
    database: {
      database: 'MyExperiment.db',
      experiment: 'test_experiment',
      sample: 'sample_001',
    },
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  },
];

console.log(exportSweepQueue(entries));
```

> ✅ Verify the script contains:
> - Queue header/imports.
> - Sweep setup with renamed variable (`sweep_0_sweep_1d`).
> - Queue assembly (`sq += (..., sweep_0_sweep_1d)`).
> - Final `sq.start()`.

Also check `exportSingleEntry(entries[0], false)` (no database/start code) and `true` (includes DB block + start).

### 3. Command execution (`qmeasure:insert-queue`)
1. Start JupyterLab, open a notebook.
2. Populate the queue using Test 1 snippet.
3. Run in console:
   ```javascript
   (async () => {
     await app.commands.execute('qmeasure:insert-queue');
   })();
   ```
4. A new code cell should appear containing the exported queue script.
5. Confirm the inserted code reflects the current queue order and database settings.

> ℹ️ If no notebook is active, the command safely logs “No active notebook found”.

### 4. Edge-case sanity
- `store.move(-1, 0)` or `store.move(0, 99)` should be ignored (no throw).
- Clearing the store should unset `selectedId`.
- Adding a duplicate `id` should replace the existing entry rather than create a copy.

---

## Regression Notes

### Phase 1
- React import is now at the top of `src/queue/queueStore.ts` (build succeeds).
- Timestamps are auto-managed in `addOrReplace`.
- `move` accepts `toIndex === entries.length` to support drop-at-end scenarios.
- Database export uses `DatabaseConfig { database, experiment, sample }`.

### Phase 2
- Sweep variable detection fixed – regex now matches sweep object assignment, not parameter assignment.
- Generated queue scripts include smart imports based on used sweep types.
- Custom parameters use `.custom_param(key, value)` method instead of constructor kwargs.
- `QueueEntry` now includes `params` field to store original parameters for editing.
- String escaping in DatabaseForm uses `JSON.stringify()` for safety.
- Persistent form storage separated from editing state – editing queued sweeps won't pollute localStorage defaults.
- All sweep forms support serialization, hydration, and "Add to Queue" functionality.

---

## Next Phase Preview
Phase 3 will add the Queue Manager UI widget:
- Right sidebar panel showing all queued sweeps.
- Drag-and-drop reordering.
- Edit/delete operations.
- Visual queue management.

---

## File Inventory
- `src/types/queue.ts` – queue types.
- `src/queue/queueStore.ts` – queue state + React hook.
- `src/queue/export.ts` – Python exporters.
- `src/plugin.ts` – `qmeasure:insert-queue` command.
