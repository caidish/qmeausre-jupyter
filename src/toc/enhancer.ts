/**
 * MutationObserver-based ToC enhancer that adds expandable info boxes to sweep headings
 */

import { Widget } from '@lumino/widgets';
import { sweepDetailsStore } from './store';
import { ParsedSweep } from './parser';

/**
 * Enhancer that decorates sweep items in the ToC with expandable info boxes
 */
export class SweepTocEnhancer {
  private observer: MutationObserver | null = null;
  private tocWidget: Widget | null = null;
  private notebookPath: string = '';
  private decoratedItems = new WeakSet<HTMLElement>();

  /**
   * Activate the enhancer
   */
  activate(tocWidget: Widget, notebookPath: string): void {
    this.tocWidget = tocWidget;
    this.notebookPath = notebookPath;

    // Attempt to locate the ToC container, retrying a few times if needed
    this.tryInitialize(0);
  }

  /**
   * Deactivate the enhancer
   */
  deactivate(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.tocWidget = null;
    this.decoratedItems = new WeakSet();
    console.log('[Sweep ToC] Enhancer deactivated');
  }

  /**
   * Attempt to find the content container, retrying if it is not yet rendered
   */
  private tryInitialize(attempt: number): void {
    const contentContainer = this.findContentContainer();

    if (!contentContainer) {
      if (attempt < 10) {
        // Retry after a short delay – the widget may not be rendered yet
        window.setTimeout(() => this.tryInitialize(attempt + 1), 100);
      } else {
        console.warn('[Sweep ToC] Could not find ToC content container after multiple attempts');
      }
      return;
    }

    this.setupObserver(contentContainer);
    console.log('[Sweep ToC] Enhancer activated');
  }

  /**
   * Set up decoration and MutationObserver once the container is available
   */
  private setupObserver(contentContainer: HTMLElement): void {
    // Disconnect any existing observer
    if (this.observer) {
      this.observer.disconnect();
    }

    // Initial decoration
    this.decorateSweepItems(contentContainer);

    // Set up MutationObserver to watch for DOM changes
    this.observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          this.decorateSweepItems(contentContainer);
        }
      }
    });

    this.observer.observe(contentContainer, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Find the ToC content container
   */
  private findContentContainer(): HTMLElement | null {
    if (!this.tocWidget) return null;

    const node = this.tocWidget.node;
    console.log('[Sweep ToC] ToC widget node:', node);
    console.log('[Sweep ToC] ToC widget classes:', node.className);

    // Try multiple selectors to find the ToC content
    const selectors = [
      '.jp-TableOfContents-content',
      '.jp-TableOfContents',
      '.toc-content',
      '.jp-toc-content'
    ];

    for (const selector of selectors) {
      const container = node.querySelector(selector) as HTMLElement;
      if (container) {
        console.log(`[Sweep ToC] Found content container with selector: ${selector}`);
        return container;
      }
    }

    // If no specific container found, use the node itself
    console.log('[Sweep ToC] Using widget node as container');
    return node;
  }

  /**
   * Decorate all sweep items in the ToC
   */
  private decorateSweepItems(container: HTMLElement): void {
    // Find all ToC items
    const items = container.querySelectorAll('.jp-tocItem');

    for (const item of Array.from(items)) {
      const htmlItem = item as HTMLElement;

      // Skip if already decorated
      if (this.decoratedItems.has(htmlItem)) {
        continue;
      }

      // Check if this is a sweep item by examining the text content
      const textNode = htmlItem.querySelector('.jp-tocItem-content');
      if (!textNode) continue;

      const dataset = (textNode as HTMLElement).dataset;
      const sweepNameAttr = dataset?.sweepName;
      const sweepTypeAttr = dataset?.sweepType;

      let icon = dataset?.sweepIcon || '';
      let sweepName = sweepNameAttr;

      if (!sweepName || !sweepTypeAttr) {
        // Fall back to parsing text content if dataset attributes are missing
        const text = textNode.textContent || '';
        const sweepMatch = text.match(/^([⏱📈📊🔄📋])\s+(\w+)/);
        if (!sweepMatch) {
          continue;
        }
        icon = sweepMatch[1];
        sweepName = sweepMatch[2];
      }

      if (!sweepName) {
        continue;
      }

      // Try to find sweep data
      const sweepData = this.findSweepData(sweepName);
      if (!sweepData) {
        console.debug(`[Sweep ToC] No data found for sweep: ${sweepName}`);
        continue;
      }

      // Decorate this item
      this.decorateItem(htmlItem, textNode as HTMLElement, sweepData, icon, sweepName);
      this.decoratedItems.add(htmlItem);
    }
  }

  /**
   * Find sweep data by name (searches the store)
   */
  private findSweepData(sweepName: string): ParsedSweep | undefined {
    return sweepDetailsStore.find(this.notebookPath, sweepName);
  }

  /**
   * Decorate a single sweep item
   */
  private decorateItem(
    item: HTMLElement,
    textNode: HTMLElement,
    sweep: ParsedSweep,
    icon: string,
    name: string
  ): void {
    // Add sweep class to the item
    item.classList.add('jp-TocSweep', 'jp-TocSweep-enhanced');
    textNode.classList.add('jp-TocSweep-heading');

    const dataset = (textNode as HTMLElement).dataset ?? {};
    const sweepTypeAttr = dataset['sweepType'];
    const sweepNameAttr = dataset['sweepName'];
    const iconAttr = dataset['sweepIcon'];

    const resolvedIcon = iconAttr || icon;
    const resolvedName = sweepNameAttr || name;

    // Clear the text node and rebuild it with enhanced markup
    textNode.innerHTML = '';

    // Create structured elements
    const iconSpan = document.createElement('span');
    iconSpan.className = 'jp-TocSweep-icon';
    iconSpan.textContent = resolvedIcon;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'jp-TocSweep-name';
    nameSpan.textContent = resolvedName;

    textNode.appendChild(iconSpan);
    textNode.appendChild(nameSpan);

    // Add warning if incomplete
    if (!sweep.complete) {
      const warning = document.createElement('span');
      warning.className = 'jp-TocSweep-warning';
      warning.textContent = '⚠';
      warning.title = 'Some parameters missing';
      textNode.appendChild(warning);
    }

    // Create toggle button
    const toggle = document.createElement('button');
    toggle.className = 'jp-TocSweep-toggle';
    toggle.type = 'button';
    toggle.textContent = '▶';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Expand details');
    toggle.title = 'Show details';

    textNode.appendChild(toggle);

    // Create info box
    const infoBox = this.createInfoBox(sweep);
    infoBox.style.display = 'none';
    infoBox.dataset.forSweep = `${this.notebookPath}:${name}`;

    // Insert the info box after the tree item so it is not constrained by the inline-flex slot
    item.insertAdjacentElement('afterend', infoBox);

    // Toggle handler
    let expanded = false;
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      expanded = !expanded;
      toggle.textContent = expanded ? '▼' : '▶';
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-label', expanded ? 'Collapse details' : 'Expand details');
      toggle.title = expanded ? 'Hide details' : 'Show details';
      infoBox.style.display = expanded ? 'block' : 'none';
    });

    // Keyboard accessibility
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        toggle.click();
      }
    });
  }

  /**
   * Create info box DOM element
   */
  private createInfoBox(sweep: ParsedSweep): HTMLElement {
    const box = document.createElement('div');
    box.className = 'jp-TocSweep-info';

    const content = document.createElement('div');
    content.className = 'jp-TocSweep-info-content';

    // Parameters section
    const params = this.getParameters(sweep);
    if (params.length > 0) {
      const section = document.createElement('div');
      section.className = 'jp-TocSweep-info-section';

      const title = document.createElement('div');
      title.className = 'jp-TocSweep-info-title';
      title.textContent = 'Parameters';
      section.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'jp-TocSweep-info-grid';

      for (const param of params) {
        const label = document.createElement('div');
        label.className = 'jp-TocSweep-info-label';
        label.textContent = param.label;

        const value = document.createElement('div');
        value.className = 'jp-TocSweep-info-value';
        value.textContent = param.value;

        grid.appendChild(label);
        grid.appendChild(value);
      }

      section.appendChild(grid);
      content.appendChild(section);
    }

    // Flags section
    const flags = this.getFlags(sweep);
    if (flags.length > 0) {
      const section = document.createElement('div');
      section.className = 'jp-TocSweep-info-section';

      const title = document.createElement('div');
      title.className = 'jp-TocSweep-info-title';
      title.textContent = 'Flags';
      section.appendChild(title);

      const flagsContainer = document.createElement('div');
      flagsContainer.className = 'jp-TocSweep-info-flags';

      for (const flag of flags) {
        const flagEl = document.createElement('div');
        flagEl.className = 'jp-TocSweep-info-flag';

        const iconEl = document.createElement('span');
        iconEl.className = 'jp-TocSweep-info-flag-icon';
        iconEl.textContent = flag.icon;

        const labelEl = document.createElement('span');
        labelEl.className = 'jp-TocSweep-info-flag-label';
        labelEl.textContent = flag.label;

        flagEl.appendChild(iconEl);
        flagEl.appendChild(labelEl);
        flagsContainer.appendChild(flagEl);
      }

      section.appendChild(flagsContainer);
      content.appendChild(section);
    }

    box.appendChild(content);
    return box;
  }

  /**
   * Extract parameters for display
   */
  private getParameters(sweep: ParsedSweep): Array<{ label: string; value: string }> {
    const params: Array<{ label: string; value: string }> = [];
    const { type, metrics } = sweep;

    switch (type) {
      case 'sweep0d':
        if (metrics.maxTime) params.push({ label: 'Max Time', value: `${metrics.maxTime} s` });
        if (metrics.interDelay) params.push({ label: 'Interval', value: `${metrics.interDelay} s` });
        if (metrics.plotBin) params.push({ label: 'Plot Bin', value: metrics.plotBin });
        if (metrics.xAxisTime) params.push({ label: 'X-Axis Time', value: metrics.xAxisTime });
        break;

      case 'sweep1d':
        if (metrics.setParam) params.push({ label: 'Parameter', value: metrics.setParam });
        if (metrics.start) params.push({ label: 'Start', value: metrics.start });
        if (metrics.stop) params.push({ label: 'Stop', value: metrics.stop });
        if (metrics.step) params.push({ label: 'Step', value: metrics.step });
        if (metrics.interDelay) params.push({ label: 'Delay', value: `${metrics.interDelay} s` });
        if (metrics.xAxisTime) params.push({ label: 'X-Axis Time', value: metrics.xAxisTime });
        break;

      case 'sweep2d':
        if (metrics.innerSweep) params.push({ label: 'Inner Sweep', value: metrics.innerSweep });
        if (metrics.outerSweep) params.push({ label: 'Outer Sweep', value: metrics.outerSweep });
        break;
    }

    return params;
  }

  /**
   * Extract flags for display
   */
  private getFlags(sweep: ParsedSweep): Array<{ label: string; icon: string }> {
    const flags: Array<{ label: string; icon: string }> = [];
    const { flags: sweepFlags } = sweep;

    if (sweepFlags.bidirectional) flags.push({ label: 'Bidirectional', icon: '↔' });
    if (sweepFlags.continual) flags.push({ label: 'Continual', icon: '∞' });
    if (sweepFlags.plotData) flags.push({ label: 'Plot Data', icon: '📊' });
    if (sweepFlags.saveData) flags.push({ label: 'Save Data', icon: '💾' });

    return flags;
  }
}
