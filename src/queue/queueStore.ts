/**
 * Queue store for managing sweep queue state
 * Singleton pattern with observer support for React components
 */

import React, { useEffect, useState } from "react";
import { QueueEntry, QueueItem, QueueLoopEntry, QueueState, isLoopEntry } from "../types/queue";

/**
 * Type for store listeners
 */
type Listener = (state: QueueState) => void;

/**
 * Queue store class - singleton pattern
 */
class QueueStore {
  private state: QueueState = {
    entries: [],
    selectedId: undefined,
    targetLoopId: undefined,
  };

  private listeners: Set<Listener> = new Set();

  /**
   * Get current state
   */
  getState(): QueueState {
    return this.state;
  }

  /**
   * Subscribe to state changes
   * @param listener - Callback function to be called on state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Add or replace a queue entry (searches recursively)
   * @param entry - Queue entry to add or replace
   */
  addOrReplace(entry: QueueEntry): void {
    const now = Date.now();
    const existing = this.findEntryRecursive(entry.id);

    if (existing) {
      // Replace existing entry - preserve createdAt, update modifiedAt
      const updatedEntry = {
        ...entry,
        createdAt: existing.createdAt,
        modifiedAt: now,
      };
      this.state = {
        ...this.state,
        entries: this.updateEntryRecursive(this.state.entries, entry.id, updatedEntry),
      };
    } else {
      // Add new entry at root - set both timestamps
      this.state = {
        ...this.state,
        entries: [
          ...this.state.entries,
          {
            ...entry,
            createdAt: entry.createdAt || now,
            modifiedAt: now,
          },
        ],
      };
    }

    this.notify();
  }

  /**
   * Remove a queue entry by ID (searches recursively)
   * @param id - ID of entry to remove
   */
  remove(id: string): void {
    // Check if we're removing the target loop or any ancestor of it
    let clearTargetLoop = false;
    if (this.state.targetLoopId) {
      // If we're removing the target loop itself
      if (id === this.state.targetLoopId) {
        clearTargetLoop = true;
      } else {
        // Check if the removed item is an ancestor loop containing the target
        const targetLoop = this.findEntryRecursive(this.state.targetLoopId);
        const removedItem = this.findEntryRecursive(id);
        if (removedItem && isLoopEntry(removedItem) && targetLoop) {
          // Check if targetLoop is nested inside removedItem
          const isAncestor = this.isNestedInside(this.state.targetLoopId, id);
          if (isAncestor) {
            clearTargetLoop = true;
          }
        }
      }
    }

    this.state = {
      ...this.state,
      entries: this.removeEntryRecursive(this.state.entries, id),
      // Clear selection if removed entry was selected
      selectedId:
        this.state.selectedId === id ? undefined : this.state.selectedId,
      // Clear target loop if it was removed or is inside removed item
      targetLoopId: clearTargetLoop ? undefined : this.state.targetLoopId,
    };
    this.notify();
  }

  /**
   * Move a queue entry from one position to another
   * @param fromIndex - Source index
   * @param toIndex - Destination index
   */
  move(fromIndex: number, toIndex: number): void {
    // Validate fromIndex
    if (fromIndex < 0 || fromIndex >= this.state.entries.length) {
      return;
    }

    // Allow toIndex === entries.length (drop at end)
    // This is common in drag-and-drop libraries
    if (toIndex < 0 || toIndex > this.state.entries.length) {
      return;
    }

    // No-op if moving to same position
    if (fromIndex === toIndex) {
      return;
    }

    const entries = [...this.state.entries];
    const [movedEntry] = entries.splice(fromIndex, 1);

    // Adjust toIndex if dropping at the end
    const insertIndex = toIndex >= entries.length ? entries.length : toIndex;
    entries.splice(insertIndex, 0, movedEntry);

    this.state = {
      ...this.state,
      entries,
    };
    this.notify();
  }

  /**
   * Clear all queue entries
   */
  clear(): void {
    this.state = {
      entries: [],
      selectedId: undefined,
      targetLoopId: undefined,
    };
    this.notify();
  }

  /**
   * Select a queue entry by ID
   * @param id - ID of entry to select (undefined to clear selection)
   */
  select(id?: string): void {
    this.state = {
      ...this.state,
      selectedId: id,
    };
    this.notify();
  }

  /**
   * Set target loop for adding new items
   * @param loopId - ID of loop to target (undefined to clear)
   */
  setTargetLoop(loopId?: string): void {
    this.state = {
      ...this.state,
      targetLoopId: loopId,
    };
    this.notify();
  }

  /**
   * Get current target loop ID
   */
  getTargetLoop(): string | undefined {
    return this.state.targetLoopId;
  }

  /**
   * Recursively find an entry by ID (searches nested loops)
   * @param id - Entry ID
   * @param items - Array to search (defaults to root entries)
   * @returns Queue item or undefined
   */
  private findEntryRecursive(id: string, items: QueueItem[] = this.state.entries): QueueItem | undefined {
    for (const item of items) {
      if (item.id === id) return item;
      if (isLoopEntry(item)) {
        const found = this.findEntryRecursive(id, item.body);
        if (found) return found;
      }
    }
    return undefined;
  }

  /**
   * Check if an item is nested inside another item
   * @param childId - ID of potential child item
   * @param parentId - ID of potential parent item
   * @returns True if childId is nested anywhere inside parentId
   */
  private isNestedInside(childId: string, parentId: string): boolean {
    const parent = this.findEntryRecursive(parentId);
    if (!parent || !isLoopEntry(parent)) return false;

    // Search parent's body recursively
    return this.findEntryRecursive(childId, parent.body) !== undefined;
  }

  /**
   * Find the parent loop containing an entry
   * @param id - Entry ID to find parent of
   * @param items - Array to search
   * @returns Parent loop entry or undefined if entry is at root
   */
  private findParentLoop(id: string, items: QueueItem[] = this.state.entries): QueueLoopEntry | undefined {
    for (const item of items) {
      if (isLoopEntry(item)) {
        // Check if id is in this loop's body
        if (item.body.some(child => child.id === id)) {
          return item;
        }
        // Recursively search deeper
        const found = this.findParentLoop(id, item.body);
        if (found) return found;
      }
    }
    return undefined;
  }

  /**
   * Recursively update an entry in the tree
   * @param entries - Current level of entries
   * @param targetId - ID of entry to update
   * @param updatedEntry - New entry data
   * @returns Updated entries array
   */
  private updateEntryRecursive(entries: QueueItem[], targetId: string, updatedEntry: QueueItem): QueueItem[] {
    return entries.map(item => {
      if (item.id === targetId) {
        return updatedEntry;
      }
      if (isLoopEntry(item)) {
        return {
          ...item,
          body: this.updateEntryRecursive(item.body, targetId, updatedEntry),
        };
      }
      return item;
    });
  }

  /**
   * Recursively remove an entry from the tree
   * @param entries - Current level of entries
   * @param targetId - ID of entry to remove
   * @returns Updated entries array
   */
  private removeEntryRecursive(entries: QueueItem[], targetId: string): QueueItem[] {
    return entries.filter(item => {
      if (item.id === targetId) return false;
      return true;
    }).map(item => {
      if (isLoopEntry(item)) {
        return {
          ...item,
          body: this.removeEntryRecursive(item.body, targetId),
        };
      }
      return item;
    });
  }

  /**
   * Get entry by ID (searches recursively through nested loops)
   * @param id - Entry ID
   * @returns Queue item or undefined
   */
  getEntry(id: string): QueueItem | undefined {
    return this.findEntryRecursive(id);
  }

  /**
   * Get all entries
   * @returns Array of queue items
   */
  getEntries(): QueueItem[] {
    return this.state.entries;
  }

  /**
   * Get selected entry
   * @returns Selected queue item or undefined
   */
  getSelectedEntry(): QueueItem | undefined {
    if (!this.state.selectedId) return undefined;
    return this.getEntry(this.state.selectedId);
  }

  /**
   * Add a loop entry to the queue
   * @param loopEntry - Loop entry to add
   */
  addLoop(loopEntry: QueueLoopEntry): void {
    const now = Date.now();
    this.state = {
      ...this.state,
      entries: [
        ...this.state.entries,
        {
          ...loopEntry,
          createdAt: loopEntry.createdAt || now,
          modifiedAt: now,
        },
      ],
    };
    this.notify();
  }

  /**
   * Update a loop entry (searches recursively)
   * @param id - Loop ID
   * @param patch - Partial update
   */
  updateLoop(id: string, patch: Partial<QueueLoopEntry>): void {
    const existing = this.findEntryRecursive(id);
    if (!existing || !isLoopEntry(existing)) return;

    const now = Date.now();
    const updated: QueueLoopEntry = {
      ...existing,
      ...patch,
      modifiedAt: now,
    };

    this.state = {
      ...this.state,
      entries: this.updateEntryRecursive(this.state.entries, id, updated),
    };
    this.notify();
  }

  /**
   * Add an entry to a loop's body (searches recursively)
   * @param loopId - Loop ID
   * @param entry - Entry to add
   * @param position - Optional position (default: end)
   */
  addToLoop(loopId: string, entry: QueueItem, position?: number): void {
    const loopEntry = this.findEntryRecursive(loopId);
    if (!loopEntry || !isLoopEntry(loopEntry)) return;

    const now = Date.now();
    const newBody = [...loopEntry.body];

    if (position !== undefined && position >= 0 && position <= newBody.length) {
      newBody.splice(position, 0, { ...entry, createdAt: entry.createdAt || now, modifiedAt: now });
    } else {
      newBody.push({ ...entry, createdAt: entry.createdAt || now, modifiedAt: now });
    }

    const updated: QueueLoopEntry = {
      ...loopEntry,
      body: newBody,
      modifiedAt: now,
    };

    this.state = {
      ...this.state,
      entries: this.updateEntryRecursive(this.state.entries, loopId, updated),
    };
    this.notify();
  }

  /**
   * Remove an entry from a loop's body (searches recursively)
   * @param loopId - Loop ID
   * @param entryId - Entry ID to remove
   */
  removeFromLoop(loopId: string, entryId: string): void {
    const loopEntry = this.findEntryRecursive(loopId);
    if (!loopEntry || !isLoopEntry(loopEntry)) return;

    const now = Date.now();
    const updated: QueueLoopEntry = {
      ...loopEntry,
      body: loopEntry.body.filter((e) => e.id !== entryId),
      modifiedAt: now,
    };

    this.state = {
      ...this.state,
      entries: this.updateEntryRecursive(this.state.entries, loopId, updated),
    };
    this.notify();
  }

  /**
   * Move an entry within a loop's body (searches recursively)
   * @param loopId - Loop ID
   * @param fromIndex - Source index within loop body
   * @param toIndex - Destination index within loop body
   */
  moveWithinLoop(loopId: string, fromIndex: number, toIndex: number): void {
    const loopEntry = this.findEntryRecursive(loopId);
    if (!loopEntry || !isLoopEntry(loopEntry)) return;

    const body = [...loopEntry.body];
    if (fromIndex < 0 || fromIndex >= body.length) return;
    if (toIndex < 0 || toIndex > body.length) return;
    if (fromIndex === toIndex) return;

    const [movedEntry] = body.splice(fromIndex, 1);
    const insertIndex = toIndex >= body.length ? body.length : toIndex;
    body.splice(insertIndex, 0, movedEntry);

    const now = Date.now();
    const updated: QueueLoopEntry = {
      ...loopEntry,
      body,
      modifiedAt: now,
    };

    this.state = {
      ...this.state,
      entries: this.updateEntryRecursive(this.state.entries, loopId, updated),
    };
    this.notify();
  }

  /**
   * Get item by path (supports nested access)
   * @param path - Array of IDs representing path to item
   * @returns Queue item or undefined
   */
  getItemByPath(path: string[]): QueueItem | undefined {
    if (path.length === 0) return undefined;

    let current: QueueItem | undefined = this.state.entries.find(e => e.id === path[0]);

    for (let i = 1; i < path.length; i++) {
      if (!current || !isLoopEntry(current)) return undefined;
      current = current.body.find(e => e.id === path[i]);
    }

    return current;
  }

  /**
   * Get path to an item (array of ancestor IDs, not including the item itself)
   * @param id - Item ID to find path to
   * @returns Array of ancestor IDs (empty if at root, undefined if not found)
   */
  getPathToItem(id: string): string[] | undefined {
    const findPath = (items: QueueItem[], currentPath: string[]): string[] | undefined => {
      for (const item of items) {
        if (item.id === id) {
          return currentPath; // Found it, return path (not including the item itself)
        }
        if (isLoopEntry(item)) {
          const found = findPath(item.body, [...currentPath, item.id]);
          if (found !== undefined) return found;
        }
      }
      return undefined;
    };

    return findPath(this.state.entries, []);
  }

  /**
   * Flatten queue to list (depth-first traversal)
   * Useful for export and display
   */
  flattenQueue(): Array<{ item: QueueItem; depth: number; parentPath: string[] }> {
    const result: Array<{ item: QueueItem; depth: number; parentPath: string[] }> = [];

    const traverse = (items: QueueItem[], depth: number, parentPath: string[]) => {
      items.forEach(item => {
        result.push({ item, depth, parentPath: [...parentPath] });
        if (isLoopEntry(item)) {
          traverse(item.body, depth + 1, [...parentPath, item.id]);
        }
      });
    };

    traverse(this.state.entries, 0, []);
    return result;
  }
}

/**
 * Singleton instance
 */
const queueStore = new QueueStore();

/**
 * React hook for using queue store in components
 */
export function useQueueStore(): {
  state: QueueState;
  addOrReplace: (entry: QueueEntry) => void;
  remove: (id: string) => void;
  move: (fromIndex: number, toIndex: number) => void;
  clear: () => void;
  select: (id?: string) => void;
  setTargetLoop: (loopId?: string) => void;
  getTargetLoop: () => string | undefined;
  getEntry: (id: string) => QueueItem | undefined;
  getEntries: () => QueueItem[];
  getSelectedEntry: () => QueueItem | undefined;
  addLoop: (loopEntry: QueueLoopEntry) => void;
  updateLoop: (id: string, patch: Partial<QueueLoopEntry>) => void;
  addToLoop: (loopId: string, entry: QueueItem, position?: number) => void;
  removeFromLoop: (loopId: string, entryId: string) => void;
  moveWithinLoop: (loopId: string, fromIndex: number, toIndex: number) => void;
  getItemByPath: (path: string[]) => QueueItem | undefined;
  getPathToItem: (id: string) => string[] | undefined;
  flattenQueue: () => Array<{ item: QueueItem; depth: number; parentPath: string[] }>;
} {
  const [state, setState] = React.useState<QueueState>(queueStore.getState());

  React.useEffect(() => {
    const unsubscribe = queueStore.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    state,
    addOrReplace: queueStore.addOrReplace.bind(queueStore),
    remove: queueStore.remove.bind(queueStore),
    move: queueStore.move.bind(queueStore),
    clear: queueStore.clear.bind(queueStore),
    select: queueStore.select.bind(queueStore),
    setTargetLoop: queueStore.setTargetLoop.bind(queueStore),
    getTargetLoop: queueStore.getTargetLoop.bind(queueStore),
    getEntry: queueStore.getEntry.bind(queueStore),
    getEntries: queueStore.getEntries.bind(queueStore),
    getSelectedEntry: queueStore.getSelectedEntry.bind(queueStore),
    addLoop: queueStore.addLoop.bind(queueStore),
    updateLoop: queueStore.updateLoop.bind(queueStore),
    addToLoop: queueStore.addToLoop.bind(queueStore),
    removeFromLoop: queueStore.removeFromLoop.bind(queueStore),
    moveWithinLoop: queueStore.moveWithinLoop.bind(queueStore),
    getItemByPath: queueStore.getItemByPath.bind(queueStore),
    getPathToItem: queueStore.getPathToItem.bind(queueStore),
    flattenQueue: queueStore.flattenQueue.bind(queueStore),
  };
}

/**
 * Get store instance for non-React usage
 */
export function getQueueStore(): QueueStore {
  return queueStore;
}
