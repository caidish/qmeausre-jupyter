/**
 * JupyterLab plugin for sweep-aware table of contents
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ITableOfContentsRegistry, TableOfContents } from '@jupyterlab/toc';
import { INotebookTracker } from '@jupyterlab/notebook';
import { SweepNotebookTocFactory } from './factory';
import { SweepTocEnhancer } from './enhancer';

/**
 * The sweep ToC plugin
 */
const tocPlugin: JupyterFrontEndPlugin<void> = {
  id: 'qmeasure-jupyter:toc',
  description: 'Table of Contents with sweep detection for QMeasure notebooks',
  autoStart: true,
  requires: [ITableOfContentsRegistry, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    tocRegistry: ITableOfContentsRegistry,
    notebookTracker: INotebookTracker
  ) => {
    console.log('QMeasure ToC plugin activated');

    // Create and register the sweep-aware ToC factory
    const factory = new SweepNotebookTocFactory(notebookTracker);

    // Add to registry - this will make it available for all notebooks
    tocRegistry.add(factory);

    // CRITICAL FIX: Reorder generators map to put our factory first
    // This ensures our sweep-aware factory is checked before the built-in notebook factory
    const generators = (tocRegistry as any)._generators as Map<
      number,
      TableOfContents.IFactory
    >;
    const entries = Array.from(generators.entries());
    generators.clear();

    // Add our factory first (it was last in the array)
    const ourEntry = entries.pop()!;
    generators.set(...ourEntry);

    // Re-add all other factories
    for (const entry of entries) {
      generators.set(...entry);
    }

    console.log('Sweep ToC factory registered and prioritized');

    // Create enhancer for adding expandable info boxes
    const enhancer = new SweepTocEnhancer();
    let currentNotebook: string | null = null;

    // Helper to find and activate enhancer
    const activateEnhancerForNotebook = (notebookPath: string) => {
      // Deactivate previous if any
      if (currentNotebook) {
        enhancer.deactivate();
      }

      // Find the ToC widget in the left sidebar
      const leftWidgets = Array.from(app.shell.widgets('left'));
      console.log('[Sweep ToC] Left widgets:', leftWidgets.map((w: any) => w.id || w.title?.label));

      const tocWidget = leftWidgets.find((w: any) => {
        const id = w.id || '';
        const title = w.title?.label || '';
        return id.includes('table-of-contents') || id.includes('toc') || title.includes('Table of Contents');
      });

      if (tocWidget) {
        console.log('[Sweep ToC] Found ToC widget:', (tocWidget as any).id);
        // Delay to ensure ToC has rendered
        setTimeout(() => {
          console.log('[Sweep ToC] Activating enhancer for:', notebookPath);
          enhancer.activate(tocWidget, notebookPath);
          currentNotebook = notebookPath;
        }, 300);
      } else {
        console.warn('[Sweep ToC] Could not find ToC widget in left sidebar');
      }
    };

    // Activate enhancer when current notebook changes
    notebookTracker.currentChanged.connect((sender, notebookPanel) => {
      if (notebookPanel) {
        const notebookPath = notebookPanel.context.path;
        console.log('[Sweep ToC] Notebook changed to:', notebookPath);
        activateEnhancerForNotebook(notebookPath);
      }
    });

    // Also activate for the current notebook if one is already open
    app.restored.then(() => {
      console.log('QMeasure ToC enhancer ready');
      if (notebookTracker.currentWidget) {
        const notebookPath = notebookTracker.currentWidget.context.path;
        console.log('[Sweep ToC] Activating for current notebook:', notebookPath);
        activateEnhancerForNotebook(notebookPath);
      }
    });
  }
};

export default tocPlugin;
