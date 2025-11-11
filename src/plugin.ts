/**
 * JupyterLab plugin definition for QMeasure Sweep Manager
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from "@jupyterlab/application";

import { INotebookTracker } from "@jupyterlab/notebook";

import { SweepManagerWidget } from "./components/SweepManager";
import { QueueManagerWidget } from "./queue/QueueManagerWidget";
import { getQueueStore } from "./queue/queueStore";
import { exportSweepQueue } from "./queue/export";

/**
 * The plugin registration information.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: "qmeasure-jupyter:plugin",
  description: "JupyterLab extension for QMeasure/MeasureIt sweep management",
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, notebookTracker: INotebookTracker) => {
    console.log("JupyterLab extension qmeasure-jupyter is activated!");

    // Create the sweep manager widget (only once, reused across activations)
    const sweepManager = new SweepManagerWidget(notebookTracker);
    sweepManager.id = "qmeasure-sweep-manager";
    sweepManager.title.caption = "Sweep Manager";
    sweepManager.title.label = "Sweep Manager";

    // Add widget to left sidebar only if not already attached
    if (!sweepManager.isAttached) {
      app.shell.add(sweepManager, "left", { rank: 500 });
    }

    // Create the queue manager widget with edit callback
    const queueManager = new QueueManagerWidget(
      notebookTracker,
      app.commands,
      (entry) => {
        // Activate the sweep manager to show the edit form
        app.shell.activateById(sweepManager.id);
        // Entry is already selected in the store by QueueManager
      },
    );
    queueManager.id = "qmeasure-queue-manager";
    queueManager.title.caption = "Sweep Queue";
    queueManager.title.label = "Queue";

    // Add widget to right sidebar only if not already attached
    if (!queueManager.isAttached) {
      app.shell.add(queueManager, "right", { rank: 620 });
    }

    // Add command to toggle visibility
    const toggleCommand = "qmeasure:toggle-sweep-manager";
    app.commands.addCommand(toggleCommand, {
      label: "Toggle Sweep Manager",
      execute: () => {
        if (sweepManager.isVisible) {
          // If visible, hide it
          sweepManager.setHidden(true);
        } else {
          // If hidden, show and activate it
          sweepManager.setHidden(false);
          app.shell.activateById(sweepManager.id);
        }
      },
    });

    // Add command to insert queue code
    const insertQueueCommand = "qmeasure:insert-queue";
    app.commands.addCommand(insertQueueCommand, {
      label: "Insert Queue Code",
      execute: () => {
        // Get queue entries from store
        const queueStore = getQueueStore();
        const entries = queueStore.getEntries();

        if (entries.length === 0) {
          console.warn("Queue is empty - nothing to insert");
          return;
        }

        // Generate Python code
        const code = exportSweepQueue(entries);

        // Get current notebook
        const notebook = notebookTracker.currentWidget?.content;
        if (!notebook) {
          console.error("No active notebook found");
          return;
        }

        const model = notebook.model;
        if (!model) {
          console.error("No notebook model available");
          return;
        }

        // Insert code into new cell
        const sharedModel = model.sharedModel;
        const activeIndex = Math.max(0, notebook.activeCellIndex);
        const insertIndex = Math.min(sharedModel.cells.length, activeIndex + 1);

        sharedModel.transact(() => {
          sharedModel.insertCell(insertIndex, {
            cell_type: "code",
            source: code,
          });
        });

        // Activate and scroll to the new cell
        notebook.activeCellIndex = insertIndex;
        const newCell = notebook.widgets[insertIndex];
        if (newCell) {
          void notebook.scrollToCell(newCell, "center");
        }
        notebook.mode = "edit";

        console.log(`Inserted queue code with ${entries.length} sweeps`);
      },
    });
  },
};

export default plugin;
