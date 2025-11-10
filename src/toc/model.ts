/**
 * Table of Contents model for detecting sweeps in notebooks
 */

import { TableOfContentsModel } from '@jupyterlab/toc';
import { NotebookPanel } from '@jupyterlab/notebook';
import { TableOfContents } from '@jupyterlab/toc';
import { parseSweeps, ParserInitError, ParseError, ParsedSweep } from './parser';
import { formatSweepAsText, formatSweepFallback } from './components';
import { sweepDetailsStore } from './store';

/**
 * Extended heading interface with sweep metadata
 */
export interface ISweepHeading extends TableOfContents.IHeading {
  cellIndex?: number;
  sweepType?: 'sweep0d' | 'sweep1d' | 'sweep2d' | 'simulsweep' | 'sweepqueue';
  sweepInfo?: {
    name?: string;
    params?: Record<string, any>;
  };
  // Store full parsed sweep data for expandable info box
  sweepData?: ParsedSweep;
  // Dataset attributes for DOM identification
  dataset?: Record<string, string>;
}

/**
 * Table of contents model for notebooks with sweep detection
 */
export class SweepNotebookTocModel extends TableOfContentsModel<TableOfContents.IHeading, NotebookPanel> {
  /**
   * Type of document supported by the model
   */
  readonly documentType = 'notebook';

  /**
   * Track if parser initialization has failed (log once)
   */
  private hasLoggedParserError = false;

  /**
   * Set active heading and navigate to the corresponding cell
   */
  setActiveHeading(heading: ISweepHeading | null, emitSignal = true): void {
    super.setActiveHeading(heading, emitSignal);
    if (!heading || heading.cellIndex === undefined) {
      return;
    }

    const notebook = this.widget.content;
    const index = Math.max(0, Math.min(heading.cellIndex, notebook.widgets.length - 1));

    // Move the viewport without entering edit mode
    void notebook.scrollToItem(index, 'center');
    notebook.activeCellIndex = index;
    notebook.mode = 'command'; // keep blue border, no cursor
  }

  /**
   * Extract headings from notebook cells, including markdown headings and sweep definitions
   */
  protected async getHeadings(): Promise<ISweepHeading[] | null> {
    const notebook = this.widget.content;
    if (!notebook || !notebook.model) {
      return [];
    }

    // Reset stored sweep details for this notebook before repopulating
    const notebookPath = this.widget.context.path;
    sweepDetailsStore.clearNotebook(notebookPath);

    const headings: ISweepHeading[] = [];
    const cells = notebook.model.sharedModel.cells;
    let lastMarkdownLevel = 0; // Track the last markdown heading level

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell) continue;

      // Extract markdown headings
      if (cell.cell_type === 'markdown') {
        const markdownHeadings = this.extractMarkdownHeadings(cell.source as string, i);
        headings.push(...markdownHeadings);

        // Update last markdown level for sweep nesting
        if (markdownHeadings.length > 0) {
          lastMarkdownLevel = markdownHeadings[markdownHeadings.length - 1].level;
        }
      }

      // Extract sweep definitions from code cells
      if (cell.cell_type === 'code') {
        const sweepHeadings = await this.extractSweepHeadings(cell.source as string, i, lastMarkdownLevel);
        headings.push(...sweepHeadings);
      }
    }

    return headings;
  }

  /**
   * Extract markdown headings from cell source
   */
  private extractMarkdownHeadings(source: string, cellIndex: number): ISweepHeading[] {
    const headings: ISweepHeading[] = [];
    const lines = source.split('\n');

    for (const line of lines) {
      // Match markdown headers: # Header, ## Header, etc.
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        headings.push({
          text,
          level,
          cellIndex
        });
      }
    }

    return headings;
  }

  /**
   * Extract sweep definitions from code cell source using tree-sitter parser
   */
  private async extractSweepHeadings(
    source: string,
    cellIndex: number,
    parentLevel: number
  ): Promise<ISweepHeading[]> {
    const headings: ISweepHeading[] = [];

    // Determine level for sweeps: one level below last markdown heading
    const sweepLevel = Math.min(parentLevel + 1, 4);

    try {
      // Use tree-sitter parser to extract sweep details
      const sweeps = await parseSweeps(source);

      // Icon map for sweep types
      const icons: Record<string, string> = {
        sweep0d: '⏱',
        sweep1d: '📈',
        sweep2d: '📊',
        simulsweep: '🔄',
        sweepqueue: '📋'
      };

      // Convert parsed sweeps to headings with polished formatting
      for (const sweep of sweeps) {
        const icon = icons[sweep.type] || '📊';
        // Compact inline text: just icon + name
        const text = `${icon} ${sweep.name}`;

        // Store sweep details in global store
        const notebookPath = this.widget.context.path;
        const sweepKey = sweepDetailsStore.makeKey(notebookPath, cellIndex, sweep.name);
        sweepDetailsStore.set(sweepKey, sweep);

        headings.push({
          text,
          level: sweepLevel,
          cellIndex,
          sweepType: sweep.type,
          sweepInfo: {
            name: sweep.name,
            params: sweep.metrics
          },
          sweepData: sweep, // Store full data for expandable info box
          dataset: {
            'data-sweep-type': sweep.type,
            'data-sweep-id': `${cellIndex}:${sweep.name}`,
            'data-cell-index': String(cellIndex),
            'data-sweep-name': sweep.name,
            'data-sweep-icon': icon
          }
        });
      }
    } catch (err) {
      // Handle parser errors gracefully
      if (err instanceof ParserInitError) {
        // Log once if parser isn't available
        if (!this.hasLoggedParserError) {
          console.warn('[Sweep ToC] Tree-sitter unavailable; showing basic info');
          this.hasLoggedParserError = true;
        }
        // Fall back to regex-based detection
        return this.extractSweepHeadingsRegex(source, cellIndex, sweepLevel);
      } else if (err instanceof ParseError) {
        // Parse error for this cell - log and fall back
        console.warn(`[Sweep ToC] Unable to analyze cell ${cellIndex}:`, err.message);
        return this.extractSweepHeadingsRegex(source, cellIndex, sweepLevel);
      } else {
        // Unknown error
        console.warn(`[Sweep ToC] Unexpected error parsing cell ${cellIndex}:`, err);
        return this.extractSweepHeadingsRegex(source, cellIndex, sweepLevel);
      }
    }

    return headings;
  }

  /**
   * Fallback regex-based sweep detection (when parser unavailable)
   */
  private extractSweepHeadingsRegex(
    source: string,
    cellIndex: number,
    sweepLevel: number
  ): ISweepHeading[] {
    const headings: ISweepHeading[] = [];

    const patterns = [
      { type: 'sweep0d' as const, regex: /(\w+)\s*=\s*Sweep0D\s*\(/g, icon: '⏱' },
      { type: 'sweep1d' as const, regex: /(\w+)\s*=\s*Sweep1D\s*\(/g, icon: '📈' },
      { type: 'sweep2d' as const, regex: /(\w+)\s*=\s*Sweep2D\s*\(/g, icon: '📊' },
      { type: 'simulsweep' as const, regex: /(\w+)\s*=\s*SimulSweep\s*\(/g, icon: '🔄' },
      { type: 'sweepqueue' as const, regex: /(\w+)\s*=\s*SweepQueue\s*\(/g, icon: '📋' }
    ];

    for (const { type, regex, icon } of patterns) {
      for (const match of source.matchAll(regex)) {
        const name = match[1];
        const text = formatSweepFallback(type, name, icon);

        headings.push({
          text,
          level: sweepLevel,
          cellIndex,
          sweepType: type,
          sweepInfo: { name }
        });
      }
    }

    return headings;
  }
}
