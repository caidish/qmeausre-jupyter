/**
 * Module-level store for sweep details accessible to the enhancer
 */

import { ParsedSweep } from './parser';

/**
 * Key format: `${notebookPath}:${cellIndex}:${sweepName}`
 */
export type SweepKey = string;

/**
 * Global store of sweep details
 */
class SweepDetailsStore {
  private details = new Map<SweepKey, ParsedSweep>();

  /**
   * Create a key for a sweep
   */
  makeKey(notebookPath: string, cellIndex: number, sweepName: string): SweepKey {
    return `${notebookPath}:${cellIndex}:${sweepName}`;
  }

  /**
   * Store sweep details
   */
  set(key: SweepKey, sweep: ParsedSweep): void {
    this.details.set(key, sweep);
  }

  /**
   * Retrieve sweep details
   */
  get(key: SweepKey): ParsedSweep | undefined {
    return this.details.get(key);
  }

  /**
   * Check if sweep exists
   */
  has(key: SweepKey): boolean {
    return this.details.has(key);
  }

  /**
   * Find sweep details by notebook path and sweep name
   */
  find(notebookPath: string, sweepName: string): ParsedSweep | undefined {
    const prefix = `${notebookPath}:`;
    for (const [key, sweep] of this.details.entries()) {
      if (key.startsWith(prefix) && sweep.name === sweepName) {
        return sweep;
      }
    }
    return undefined;
  }

  /**
   * Clear all sweep details for a notebook
   */
  clearNotebook(notebookPath: string): void {
    const keysToDelete: SweepKey[] = [];
    for (const key of this.details.keys()) {
      if (key.startsWith(`${notebookPath}:`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.details.delete(key);
    }
  }

  /**
   * Clear all sweep details
   */
  clear(): void {
    this.details.clear();
  }
}

/**
 * Singleton instance
 */
export const sweepDetailsStore = new SweepDetailsStore();
