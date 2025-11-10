/**
 * Code generation service for MeasureIt sweep templates
 */

import {
  Sweep0DParameters,
  Sweep1DParameters,
  Sweep2DParameters
} from '../types';

/**
 * Convert TypeScript value to Python literal
 */
function toPython(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '_required';
  }
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }
  if (typeof value === 'string') {
    return value;
  }
  return String(value);
}

/**
 * Generate Sweep0D code
 */
export function generateSweep0D(params: Sweep0DParameters): string {
  const sweepName = params.sweep_name || 's_0D';
  const followParamsCode = params.follow_params.length > 0
    ? params.follow_params.map(p => `${sweepName}.follow_param(station.${p})`).join('\n')
    : '# No follow parameters specified';

  return `# Generated Sweep0D - Time-based measurement
${sweepName} = Sweep0D(
    max_time=${toPython(params.max_time)},  # seconds
    inter_delay=${params.inter_delay ?? 0.01},  # delay between points
    plot_data=${toPython(params.plot_data ?? true)},
    save_data=${toPython(params.save_data ?? true)},
    plot_bin=${params.plot_bin ?? 1},
    suppress_output=${toPython(params.suppress_output ?? true)}
)

# Add parameters to follow
${followParamsCode}

# Start sweep
ensure_qt()
${sweepName}.start()`;
}

/**
 * Generate Sweep1D code
 */
export function generateSweep1D(params: Sweep1DParameters): string {
  const sweepName = params.sweep_name || 's_1D';
  const followParamsCode = params.follow_params.length > 0
    ? params.follow_params.map(p => `${sweepName}.follow_param(station.${p})`).join('\n')
    : '# No follow parameters specified';

  return `# Generated Sweep1D - Single parameter sweep
set_param = station.${toPython(params.set_param)}

${sweepName} = Sweep1D(
    set_param=set_param,
    start=${toPython(params.start)},
    stop=${toPython(params.stop)},
    step=${toPython(params.step)},
    bidirectional=${toPython(params.bidirectional ?? false)},
    continual=${toPython(params.continual ?? false)},
    x_axis_time=${params.x_axis_time ?? 0},
    err=${params.err ?? 0},
    inter_delay=${params.inter_delay ?? 0.01},
    plot_data=${toPython(params.plot_data ?? true)},
    save_data=${toPython(params.save_data ?? true)},
    plot_bin=${params.plot_bin ?? 1},
    back_multiplier=${params.back_multiplier ?? 1},
    suppress_output=${toPython(params.suppress_output ?? true)}
)

# Add parameters to follow
${followParamsCode}

# Start sweep
ensure_qt()
${sweepName}.start()`;
}

/**
 * Generate Sweep2D code
 */
export function generateSweep2D(params: Sweep2DParameters): string {
  const sweepName = params.sweep_name || 's_2D';
  const followParamsCode = params.follow_params.length > 0
    ? params.follow_params.map(p => `${sweepName}.follow_param(station.${p})`).join('\n')
    : '# No follow parameters specified';

  return `# Generated Sweep2D - 2D parameter sweep
# Define inner sweep parameters
in_params = [
    station.${toPython(params.in_param)},  # parameter
    ${toPython(params.in_start)},  # start
    ${toPython(params.in_stop)},   # stop
    ${toPython(params.in_step)}    # step
]

# Define outer sweep parameters
out_params = [
    station.${toPython(params.out_param)},  # parameter
    ${toPython(params.out_start)},  # start
    ${toPython(params.out_stop)},   # stop
    ${toPython(params.out_step)}    # step
]

${sweepName} = Sweep2D(
    in_params=in_params,
    out_params=out_params,
    inter_delay=${params.inter_delay ?? 0.01},
    outer_delay=${params.outer_delay ?? 0.1},
    save_data=${toPython(params.save_data ?? true)},
    plot_data=${toPython(params.plot_data ?? true)},
    plot_bin=${params.plot_bin ?? 1},
    back_multiplier=${params.back_multiplier ?? 1},
    out_ministeps=${params.out_ministeps ?? 1},
    err=${params.err ?? 0},
    suppress_output=${toPython(params.suppress_output ?? true)}
)

# Add parameters to follow
${followParamsCode}

# Start sweep
ensure_qt()
${sweepName}.start()`;
}
