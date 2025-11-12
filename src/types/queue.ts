/**
 * Queue system types for managing multiple sweep operations
 * Enhanced to support loops and functions
 */

import { SweepCode } from './index';

/**
 * Queue item type discriminator
 */
export type QueueItemType = 'sweep' | 'function' | 'loop';

/**
 * Database configuration for a queue entry
 * Maps to MeasureIt's DatabaseEntry(db_path, exp_name, sample_name)
 */
export interface DatabaseConfig {
  /**
   * Database name (e.g., "MyExperiment.db")
   * Will be resolved to full path via get_path("databases")
   */
  database: string;

  /**
   * Experiment name for this sweep
   */
  experiment: string;

  /**
   * Sample name for this sweep
   */
  sample: string;

  /**
   * Optional metadata (not currently used by MeasureIt)
   */
  meta?: Record<string, any>;
}

/**
 * Queue entry for custom Python function
 */
export interface QueueFunctionEntry {
  /**
   * Unique identifier for this queue entry
   */
  id: string;

  /**
   * Type discriminator
   */
  queueType: 'function';

  /**
   * Human-readable name for this function
   */
  name: string;

  /**
   * Display label for UI
   */
  label: string;

  /**
   * Python code to execute
   */
  pythonCode: string;

  /**
   * Optional template ID (e.g., 'pause', 'flush_db')
   */
  templateId?: string;

  /**
   * Timestamp when entry was created
   */
  createdAt: number;

  /**
   * Timestamp when entry was last modified
   */
  modifiedAt: number;

  /**
   * Optional icon identifier
   */
  icon?: string;
}

/**
 * Queue entry for loop blocks
 */
export interface QueueLoopEntry {
  /**
   * Unique identifier for this queue entry
   */
  id: string;

  /**
   * Type discriminator
   */
  queueType: 'loop';

  /**
   * Human-readable name for this loop
   */
  name: string;

  /**
   * Display label for UI (e.g., "Repeat 5×" or "For value in [...]")
   */
  label: string;

  /**
   * Loop kind: repeat for count-based, values for list iteration
   */
  loopKind: 'repeat' | 'values';

  /**
   * Repeat count (for repeat loops)
   */
  count?: number;

  /**
   * List of values to iterate over (for values loops)
   * Each value is a Python expression as string
   */
  values?: string[];

  /**
   * Variable name for values loop (e.g., 'setpoint', 'voltage')
   */
  loopVarName?: string;

  /**
   * Nested queue items within this loop
   */
  body: QueueItem[];

  /**
   * Timestamp when entry was created
   */
  createdAt: number;

  /**
   * Timestamp when entry was last modified
   */
  modifiedAt: number;

  /**
   * Optional icon identifier
   */
  icon?: string;
}

/**
 * Queue entry representing a single sweep operation
 */
export interface QueueSweepEntry {
  /**
   * Unique identifier for this queue entry
   */
  id: string;

  /**
   * Type discriminator
   */
  queueType: 'sweep';

  /**
   * Human-readable name for this sweep
   */
  name: string;

  /**
   * Type of sweep (0D, 1D, 2D, simul, fast)
   */
  sweepType: 'sweep0d' | 'sweep1d' | 'sweep2d' | 'simulsweep' | 'sweepto' | 'gateleakage';

  /**
   * Generated code segments
   */
  code: SweepCode;

  /**
   * Original parameters used to generate this sweep
   * Used for editing/hydrating forms
   */
  params: any;

  /**
   * Optional database configuration
   */
  database?: DatabaseConfig;

  /**
   * Timestamp when entry was created
   */
  createdAt: number;

  /**
   * Timestamp when entry was last modified
   */
  modifiedAt: number;

  /**
   * Optional icon identifier
   */
  icon?: string;
}

/**
 * Union type for all queue items (supports nesting)
 */
export type QueueItem = QueueSweepEntry | QueueFunctionEntry | QueueLoopEntry;

/**
 * Backward compatibility alias
 * @deprecated Use QueueSweepEntry for new code
 */
export type QueueEntry = QueueSweepEntry;

/**
 * Queue state
 */
export interface QueueState {
  /**
   * All queue entries in order (can include nested loops)
   */
  entries: QueueItem[];

  /**
   * Currently selected entry ID
   */
  selectedId?: string;

  /**
   * Path to selected item (for nested selection)
   * Array of IDs representing path from root to selected item
   */
  selectedPath?: string[];

  /**
   * Target loop ID for adding new items
   * When set, "Add to Queue" operations will add to this loop instead of root
   */
  targetLoopId?: string;
}

/**
 * Type guard for sweep entries
 */
export function isSweepEntry(item: QueueItem): item is QueueSweepEntry {
  return item.queueType === 'sweep';
}

/**
 * Type guard for function entries
 */
export function isFunctionEntry(item: QueueItem): item is QueueFunctionEntry {
  return item.queueType === 'function';
}

/**
 * Type guard for loop entries
 */
export function isLoopEntry(item: QueueItem): item is QueueLoopEntry {
  return item.queueType === 'loop';
}
