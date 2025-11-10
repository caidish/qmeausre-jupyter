/**
 * JupyterLab plugin definition for QMeasure Sweep Manager
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';

import { SweepManagerWidget } from './components/SweepManager';

/**
 * The plugin registration information.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'qmeasure-jupyter:plugin',
  description: 'JupyterLab extension for QMeasure/MeasureIt sweep management',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, notebookTracker: INotebookTracker) => {
    console.log('JupyterLab extension qmeasure-jupyter is activated!');

    // Create the sweep manager widget (only once, reused across activations)
    const sweepManager = new SweepManagerWidget(notebookTracker);
    sweepManager.id = 'qmeasure-sweep-manager';
    sweepManager.title.caption = 'Sweep Manager';
    sweepManager.title.label = 'Sweep Manager';

    // Add widget to left sidebar only if not already attached
    if (!sweepManager.isAttached) {
      app.shell.add(sweepManager, 'left', { rank: 500 });
    }

    // Add command to toggle visibility
    const command = 'qmeasure:toggle-sweep-manager';
    app.commands.addCommand(command, {
      label: 'Toggle Sweep Manager',
      execute: () => {
        if (sweepManager.isVisible) {
          // If visible, hide it
          sweepManager.setHidden(true);
        } else {
          // If hidden, show and activate it
          sweepManager.setHidden(false);
          app.shell.activateById(sweepManager.id);
        }
      }
    });
  }
};

export default plugin;
