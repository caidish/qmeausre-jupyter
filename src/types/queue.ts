/**
 * Queue system types for managing multiple sweep operations
 */

import { SweepCode } from './index';

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
 * Queue entry representing a single sweep operation
 */
export interface QueueEntry {
  /**
   * Unique identifier for this queue entry
   */
  id: string;

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
 * Queue state
 */
export interface QueueState {
  /**
   * All queue entries in order
   */
  entries: QueueEntry[];

  /**
   * Currently selected entry ID
   */
  selectedId?: string;
}
