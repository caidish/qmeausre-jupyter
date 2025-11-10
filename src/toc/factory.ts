/**
 * Table of Contents factory for notebooks with sweep detection
 */

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { TableOfContents } from '@jupyterlab/toc';
import { SweepNotebookTocModel, ISweepHeading } from './model';
import { Widget } from '@lumino/widgets';

/**
 * Factory for creating sweep-aware table of contents for notebooks
 */
export class SweepNotebookTocFactory implements TableOfContents.IFactory {
  constructor(protected tracker: INotebookTracker) {}

  /**
   * Whether the factory can handle the widget or not
   */
  isApplicable = (widget: Widget): boolean => {
    // Only applicable to notebook panels
    return this.tracker.has(widget);
  };

  /**
   * Create a new table of contents model
   */
  createNew = (
    widget: Widget,
    configuration?: TableOfContents.IConfig
  ): TableOfContents.IModel<TableOfContents.IHeading> => {
    if (!this.tracker.has(widget)) {
      throw new Error('Widget is not a notebook panel');
    }
    return new SweepNotebookTocModel(widget as NotebookPanel, configuration);
  };
}
