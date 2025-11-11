# QMeasure Jupyter – MeasureIt Runtime Support Roadmap

## Phase 1 – Queue Infrastructure ✅
- [x] **Queue Store (`src/queue/queueStore.ts`)**
  - Export singleton (`useQueueStore`) with state `{ entries: QueueEntry[], selectedId?: string }`.
  - Actions: `addOrReplace(entry: QueueEntry)`, `remove(id)`, `move(from, to)`, `clear()`, `select(id)`.
  - `QueueEntry` interface lives in new `src/types/queue.ts`.
- [x] **Python Export (`src/queue/export.ts`)**
  - Implement `exportSweepQueue(entries: QueueEntry[]): string`.
  - Ensure each entry injects its `code.setup`; append queue body:
    ```python
    from measureit.tools.sweep_queue import SweepQueue, DatabaseEntry
    sq = SweepQueue()
    # ...
    sq += (DatabaseEntry(...), sweep_obj)
    ```
  - When entry has deferred `code.start`, append after DB block.
- [x] **Command Registration (`src/plugin.ts`)**
  - Add command `qmeasure:insert-queue`:
    - Fetch entries from store.
    - Generate script via `exportSweepQueue`.
    - Insert into active notebook cell (reuse helper from `SweepManager`).

## Phase 2 – Sweep Manager Integration ✅
- [x] **Form Serialisation**
  - Each form (`src/components/Sweep0DForm.tsx`, etc.) exports `serialize()` & accepts `initialState`.
  - Update `SweepManager.tsx`:
    - Add "Add to Queue" button -> generate sweep code and push to store.
    - All forms now support `onAddToQueue` callback.
- [x] **Queue Integration**
  - SweepManager creates QueueEntry with generated code.
  - Entries are added to queue store with automatic timestamps.
  - Forms support hydration via `initialState` prop (ready for Phase 3 editing).
- [ ] **Database Coordination** (Deferred to Phase 3)
  - Database entries can be added when building Queue Manager UI.
  - Will support editing database config for queued sweeps.

## Phase 3 – Queue Manager UI ✅
- [x] **Widget Mount (`src/queue/QueueManagerWidget.tsx`)**
  - ReactWidget added in plugin activate: `app.shell.add(widget, 'right', { rank: 620 })`.
  - Subscribe to queue store for updates.
- [x] **List Component (`QueueManager.tsx`)**
  - Render entries with icon, name, optional database info.
  - Actions:
    - Edit: loads form in Sweep Manager with `initialState` + visual editing banner.
    - Delete: `store.remove` with confirmation.
    - Duplicate: clone entry with new id.
    - Reorder: up/down buttons for moving entries.
  - Footer buttons: "Insert Queue Code" (dispatch command), "Clear Queue".
- [ ] **Notifications** (Deferred - basic console logging sufficient for now)
  - Can add JupyterLab `showNotification` for add/remove/reorder feedback in future iteration.

## Phase 4 – Fast Sweeps Tab ✅
- [x] **UI (`src/components/FastSweepsForm.tsx`)**
  - Add new tab in `SweepManager.tsx` named "Fast Sweeps".
  - Provide selector between:
    1. **Sweepto** – fields: `parameter_path`, `setpoint`, `step`.
       - Generate Sweep1D using `station.{parameter}`; comment includes `current_value = station...get()`.
       - Defaults: `save_data=False`, `plot_data=True`, `plot_bin=1`.
    2. **GateLeakage** – inputs (set_param, track_param, `max_current`, `limit`, `step`, `inter_delay`); emit GateLeakage snippet.
  - Both options deliver `SweepCode` + integration with Add-to-Queue.
- [x] **Code Generators (`src/services/CodeGenerator.ts`)**
  - Add `generateSweepto(params)` and `generateGateLeakage(params)` returning `{ setup, start }`.
  - Update exports & type definitions in `src/types/index.d.ts`.

## Phase 5 – Parser, Details Panel, and Queue Analytics
- [ ] **Tree-Sitter Enhancements (`src/toc/parser.ts`)**
  - Detect queue definitions (`SweepQueue()` and `sq += ...`) and map sweeps back to queue entries (use comment markers or generated IDs).
  - Support fast sweep templates (Sweepto/GateLeakage positional args).
- [ ] **Details Panel (`src/toc/panel.tsx`)**
  - Display “Queued (position N)” badge when a sweep originates from the queue.
  - Show database target and any loop/function context (from `TODO_enhanced_queue.md` ideas).
- [ ] **Queue Analytics (optional)**
  - Surface queue summary in details panel (total sweeps, loops, function callbacks).
  - (Deferred) ready to integrate loop/function metadata once implemented.

## Phase 6 – Testing & Documentation
- [ ] **Automated Tests**
  - Add queue store unit tests under `tests/queueStore.test.ts`.
  - Snapshot tests for `exportSweepQueue` outputs (with/without DB).
  - Jest tests for fast sweep generators.
- [ ] **Manual QA Checklist**
  - Document in `USAGE.md`: build mixed queue, edit entries, export script, run in MeasureIt environment.
- [ ] **Docs**
  - Update README/USAGE with queue workflow, fast sweeps, runtime notes.
  - Add tooltips inside Queue Manager + Fast Sweeps form.

## Phase 7 – Release Preparation
- [ ] `jlpm build`
- [ ] `pip install -e .`
- [ ] `jupyter labextension list`
- [ ] Bump version (`package.json`, `pyproject.toml`)
- [ ] Tag release + update changelog summarising queue manager & fast sweeps.
