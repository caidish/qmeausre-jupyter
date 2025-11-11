/**
 * Code generation service for MeasureIt sweep templates
 */

import {
  Sweep0DParameters,
  Sweep1DParameters,
  Sweep2DParameters,
  SimulSweepParameters,
  SweeptoParameters,
  GateLeakageParameters,
  SweepCode,
} from "../types";

/**
 * Convert TypeScript value to Python literal
 */
function toPython(value: any): string {
  if (value === null || value === undefined || value === "") {
    return "_required";
  }
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value);
}

/**
 * Convert custom parameter value to Python expression
 * Intelligently quotes string-like values while preserving Python expressions
 */
function customParamValueToPython(value: string): string {
  const trimmed = value.trim();

  // Empty value
  if (!trimmed) {
    return '""';
  }

  // Already a quoted string
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed;
  }

  // Boolean literals
  if (trimmed === "True" || trimmed === "False") {
    return trimmed;
  }

  // None literal
  if (trimmed === "None") {
    return trimmed;
  }

  // Number (int or float)
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
    return trimmed;
  }

  // List or dict literal (starts with [ or {)
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return trimmed;
  }

  // Function call (contains parentheses)
  if (trimmed.includes("(") && trimmed.includes(")")) {
    return trimmed;
  }

  // Attribute access (e.g., station.param)
  if (/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(trimmed)) {
    return trimmed;
  }

  // Simple identifier (variable name)
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }

  // Default: treat as string and quote it
  return JSON.stringify(trimmed);
}

/**
 * Render sweep code segments as a complete string
 * @param code - Sweep code segments
 * @param includeStart - Whether to include the start segment (default: true)
 */
export function renderSweepCode(
  code: SweepCode,
  includeStart: boolean = true,
): string {
  if (includeStart) {
    return `${code.setup}\n\n${code.start}`;
  }
  return code.setup;
}

/**
 * Generate Sweep0D code segments
 */
export function generateSweep0D(params: Sweep0DParameters): SweepCode {
  const sweepName = params.sweep_name || "s_0D";
  const followParamsCode =
    params.follow_params.length > 0
      ? params.follow_params
          .map((p) => `${sweepName}.follow_param(${p})`)
          .join("\n")
      : "# No follow parameters specified";

  // Build custom parameters using .custom_param() method
  const customParamsCode =
    params.custom_params && params.custom_params.length > 0
      ? params.custom_params
          .map(
            (cp) =>
              `${sweepName}.custom_param("${cp.key}", ${customParamValueToPython(cp.value)})`,
          )
          .join("\n")
      : "# No custom parameters";

  const setup = `# Generated Sweep0D - Time-based measurement
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

# Add custom parameters
${customParamsCode}`;

  const start = `# Start sweep
ensure_qt()
${sweepName}.start()`;

  return { setup, start };
}

/**
 * Generate Sweep1D code segments
 */
export function generateSweep1D(params: Sweep1DParameters): SweepCode {
  const sweepName = params.sweep_name || "s_1D";
  const followParamsCode =
    params.follow_params.length > 0
      ? params.follow_params
          .map((p) => `${sweepName}.follow_param(${p})`)
          .join("\n")
      : "# No follow parameters specified";

  // Build custom parameters using .custom_param() method
  const customParamsCode =
    params.custom_params && params.custom_params.length > 0
      ? params.custom_params
          .map(
            (cp) =>
              `${sweepName}.custom_param("${cp.key}", ${customParamValueToPython(cp.value)})`,
          )
          .join("\n")
      : "# No custom parameters";

  const setup = `# Generated Sweep1D - Single parameter sweep
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

# Add custom parameters
${customParamsCode}`;

  const start = `# Start sweep
ensure_qt()
${sweepName}.start()`;

  return { setup, start };
}

/**
 * Generate Sweep2D code segments
 */
export function generateSweep2D(params: Sweep2DParameters): SweepCode {
  const sweepName = params.sweep_name || "s_2D";
  const followParamsCode =
    params.follow_params.length > 0
      ? params.follow_params
          .map((p) => `${sweepName}.follow_param(${p})`)
          .join("\n")
      : "# No follow parameters specified";

  // Build custom parameters using .custom_param() method
  const customParamsCode =
    params.custom_params && params.custom_params.length > 0
      ? params.custom_params
          .map(
            (cp) =>
              `${sweepName}.custom_param("${cp.key}", ${customParamValueToPython(cp.value)})`,
          )
          .join("\n")
      : "# No custom parameters";

  const setup = `# Generated Sweep2D - 2D parameter sweep
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

# Add custom parameters
${customParamsCode}`;

  const start = `# Start sweep
ensure_qt()
${sweepName}.start()`;

  return { setup, start };
}

/**
 * Generate SimulSweep code segments
 */
export function generateSimulSweep(params: SimulSweepParameters): SweepCode {
  const sweepName = params.sweep_name || "s_simul";
  const followParamsCode =
    params.follow_params.length > 0
      ? params.follow_params
          .map((p) => `${sweepName}.follow_param(${p})`)
          .join("\n")
      : "# No follow parameters specified";

  // Build custom parameters using .custom_param() method
  const customParamsCode =
    params.custom_params && params.custom_params.length > 0
      ? params.custom_params
          .map(
            (cp) =>
              `${sweepName}.custom_param("${cp.key}", ${customParamValueToPython(cp.value)})`,
          )
          .join("\n")
      : "# No custom parameters";

  // Build parameter dictionary
  const paramEntries = params.params
    .map((p) => {
      return `    ${p.paramPath}: {"start": ${p.start}, "stop": ${p.stop}, "step": ${p.step}}`;
    })
    .join(",\n");

  const paramDict = `parameter_dict = {\n${paramEntries}\n}`;

  // Build sweep args (only include non-default values)
  const sweepArgs: string[] = [];
  if (params.bidirectional)
    sweepArgs.push(`    "bidirectional": ${toPython(params.bidirectional)}`);
  if (params.continual)
    sweepArgs.push(`    "continual": ${toPython(params.continual)}`);
  if (params.save_data !== undefined)
    sweepArgs.push(`    "save_data": ${toPython(params.save_data)}`);
  if (params.plot_data !== undefined)
    sweepArgs.push(`    "plot_data": ${toPython(params.plot_data)}`);
  if (params.inter_delay !== undefined)
    sweepArgs.push(`    "inter_delay": ${params.inter_delay}`);
  if (params.plot_bin !== undefined)
    sweepArgs.push(`    "plot_bin": ${params.plot_bin}`);
  if (params.err !== undefined) sweepArgs.push(`    "err": ${params.err}`);
  if (params.suppress_output)
    sweepArgs.push(
      `    "suppress_output": ${toPython(params.suppress_output)}`,
    );

  const sweepArgsDict =
    sweepArgs.length > 0 ? `sweep_args = {\n${sweepArgs.join(",\n")}\n}` : "";

  const setup = `# Generated SimulSweep - Simultaneous parameter sweep
${paramDict}

${sweepArgsDict ? `${sweepArgsDict}\n\n` : ""}${sweepName} = SimulSweep(${sweepArgsDict ? "parameter_dict, **sweep_args" : "parameter_dict"})

# Add parameters to follow
${followParamsCode}

# Add custom parameters
${customParamsCode}`;

  const start = `# Start sweep
ensure_qt()
${sweepName}.start()`;

  return { setup, start };
}

/**
 * Generate Sweepto code segments (fast sweep to setpoint)
 */
export function generateSweepto(params: SweeptoParameters): SweepCode {
  const sweepName = params.sweep_name || "s_to";

  const setup = `# Generated Sweepto - Fast sweep to setpoint
# Get current value for reference
set_param = station.${toPython(params.parameter_path)}
current_value = set_param.get()

${sweepName} = Sweep1D(
    set_param=set_param,
    start=current_value,
    stop=${toPython(params.setpoint)},
    step=${toPython(params.step)},
    save_data=${toPython(params.save_data ?? false)},
    plot_data=${toPython(params.plot_data ?? true)},
    plot_bin=${params.plot_bin ?? 1}
)`;

  const start = `# Start sweep
ensure_qt()
${sweepName}.start()`;

  return { setup, start };
}

/**
 * Generate GateLeakage code segments (gate limit test)
 */
export function generateGateLeakage(params: GateLeakageParameters): SweepCode {
  const sweepName = params.sweep_name || "s_gate";

  const setup = `# Generated GateLeakage - Gate limit test
set_param = station.${toPython(params.set_param)}
track_param = station.${toPython(params.track_param)}

${sweepName} = GateLeakage(
    set_param=set_param,
    track_param=track_param,
    max_I=${toPython(params.max_current)},
    limit=${toPython(params.limit)},
    step=${toPython(params.step)},
    inter_delay=${params.inter_delay ?? 0.01},
    save_data=${toPython(params.save_data ?? false)},
    plot_data=${toPython(params.plot_data ?? true)}
)`;

  const start = `# Start sweep
ensure_qt()
${sweepName}.start()`;

  return { setup, start };
}
