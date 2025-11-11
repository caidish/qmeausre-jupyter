/**
 * Type definitions for QMeasure Jupyter extension
 */

/**
 * Sweep types supported by MeasureIt
 */
export type SweepType = 'sweep0d' | 'sweep1d' | 'sweep2d' | 'simulsweep' | 'sweepto' | 'gateleakage';

/**
 * Base parameters common to all sweep types
 */
/**
 * Custom parameter entry
 */
export interface CustomParamEntry {
  key: string;
  value: string;
}

export interface BaseSweepParameters {
  sweep_name?: string;
  inter_delay: number;
  save_data: boolean;
  plot_data: boolean;
  plot_bin: number;
  complete_func?: string;
  suppress_output: boolean;
  follow_params: string[];
  custom_params?: CustomParamEntry[];
}

/**
 * Sweep0D specific parameters
 */
export interface Sweep0DParameters extends BaseSweepParameters {
  max_time: number;
}

/**
 * Sweep1D specific parameters
 */
export interface Sweep1DParameters extends BaseSweepParameters {
  set_param: string;
  start: number;
  stop: number;
  step: number;
  bidirectional: boolean;
  continual: boolean;
  x_axis_time: number;
  err: number;
  back_multiplier: number;
}

/**
 * Sweep2D specific parameters
 */
export interface Sweep2DParameters extends BaseSweepParameters {
  in_param: string;
  in_start: number;
  in_stop: number;
  in_step: number;
  out_param: string;
  out_start: number;
  out_stop: number;
  out_step: number;
  outer_delay: number;
  out_ministeps: number;
  err: number;
  back_multiplier: number;
  update_func?: string;
}

/**
 * SimulSweep parameter entry
 */
export interface SimulSweepParamEntry {
  paramPath: string;
  start: number;
  stop: number;
  step: number;
}

/**
 * SimulSweep specific parameters
 */
export interface SimulSweepParameters extends BaseSweepParameters {
  params: SimulSweepParamEntry[];
  n_steps?: number;
  err: number;
  bidirectional: boolean;
  continual: boolean;
}

/**
 * Sweepto specific parameters (fast sweep to setpoint)
 */
export interface SweeptoParameters {
  sweep_name?: string;
  parameter_path: string;
  setpoint: number;
  step: number;
  save_data: boolean;
  plot_data: boolean;
  plot_bin: number;
}

/**
 * GateLeakage specific parameters (gate limit test)
 */
export interface GateLeakageParameters {
  sweep_name?: string;
  set_param: string;
  track_param: string;
  max_current: number;
  limit: number;
  step: number;
  inter_delay: number;
  save_data: boolean;
  plot_data: boolean;
}

/**
 * Union type for all sweep parameters
 */
export type SweepParameters =
  | Sweep0DParameters
  | Sweep1DParameters
  | Sweep2DParameters
  | SimulSweepParameters
  | SweeptoParameters
  | GateLeakageParameters;

/**
 * Sweep code segments for deferred start
 */
export interface SweepCode {
  /**
   * Sweep setup code (construction, follow params)
   */
  setup: string;

  /**
   * Sweep start code (ensure_qt() and s.start())
   */
  start: string;
}

/**
 * Form field types
 */
export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'textarea';

/**
 * Form field definition
 */
export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  default?: any;
  required?: boolean;
  help?: string;
  min?: number;
  max?: number;
  unit?: string;
  group?: string;
  options?: Array<{ value: any; label: string }>;
  validator?: (value: any) => boolean | string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}
