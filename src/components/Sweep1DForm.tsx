/**
 * Form component for Sweep1D parameters
 */

import React, { useState } from "react";
import { FormInput } from "./FormInput";
import { CustomParams, CustomParamEntry } from "./CustomParams";
import { FormField, Sweep1DParameters } from "../types";
import {
  usePersistentForm,
  getDefaultValues,
} from "../hooks/usePersistentForm";

interface Sweep1DFormProps {
  onGenerate: (params: Sweep1DParameters) => void;
  initialState?: Partial<Sweep1DParameters>;
  onAddToQueue?: (params: Sweep1DParameters) => void;
}

const SWEEP1D_FIELDS: FormField[] = [
  {
    name: "sweep_name",
    label: "Sweep Name",
    type: "text",
    default: "s_1D",
    help: "Variable name for the sweep object (default: s_1D)",
  },
  {
    name: "set_param",
    label: "Parameter to Sweep",
    type: "text",
    required: true,
    help: "Enter parameter path (e.g., keithley.voltage)",
  },
  {
    name: "start",
    label: "Start Value",
    type: "number",
    required: true,
    help: "Starting value for the sweep",
  },
  {
    name: "stop",
    label: "Stop Value",
    type: "number",
    required: true,
    help: "Ending value for the sweep",
  },
  {
    name: "step",
    label: "Step Size",
    type: "number",
    required: true,
    help: "Step size (sign will auto-adjust based on start/stop)",
  },
  {
    name: "bidirectional",
    label: "Bidirectional Sweep",
    type: "boolean",
    default: false,
    help: "Sweep back and forth",
  },
  {
    name: "continual",
    label: "Continuous Sweep",
    type: "boolean",
    default: false,
    help: "Continue sweeping indefinitely",
  },
  {
    name: "x_axis_time",
    label: "X-Axis",
    type: "select",
    default: 0,
    options: [
      { value: 0, label: "Parameter Value" },
      { value: 1, label: "Time" },
    ],
    help: "What to plot on the x-axis",
  },
  {
    name: "inter_delay",
    label: "Inter Delay",
    type: "number",
    default: 0.1,
    min: 0,
    unit: "s",
    help: "Time to wait between data points",
  },
  {
    name: "err",
    label: "Error Tolerance",
    type: "number",
    default: 0.01,
    min: 0,
    help: "Tolerance for rounding errors",
  },
  {
    name: "back_multiplier",
    label: "Back Multiplier",
    type: "number",
    default: 1,
    help: "Step size multiplier after direction change",
  },
  {
    name: "save_data",
    label: "Save to Database",
    type: "boolean",
    default: true,
  },
  {
    name: "plot_data",
    label: "Live Plotting",
    type: "boolean",
    default: true,
  },
  {
    name: "plot_bin",
    label: "Plot Bin Size",
    type: "number",
    default: 1,
    min: 1,
  },
  {
    name: "follow_params",
    label: "Follow Parameters",
    type: "textarea",
    default: "",
    help: "Enter one parameter per line (e.g., dmm.voltage)",
  },
  {
    name: "suppress_output",
    label: "Suppress Output",
    type: "boolean",
    default: false,
  },
];

export const Sweep1DForm: React.FC<Sweep1DFormProps> = ({
  onGenerate,
  initialState,
  onAddToQueue,
}) => {
  // If initialState is provided, use it directly without localStorage persistence
  // Otherwise use persistent form storage
  const defaults = getDefaultValues(SWEEP1D_FIELDS);
  const [persistentValues, setPersistentValues, resetPersistent] =
    usePersistentForm("qmeasure:sweep1d", defaults);

  // Use initialState if provided, otherwise use persistent storage
  const [values, setValuesState] = useState<Record<string, any>>(
    initialState || persistentValues,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customParams, setCustomParams] = useState<CustomParamEntry[]>(
    initialState?.custom_params || [],
  );

  // Update form when initialState changes (for editing queued sweeps)
  React.useEffect(() => {
    if (initialState) {
      // Normalize follow_params: convert array to newline-separated string
      const followParams = Array.isArray(initialState.follow_params)
        ? initialState.follow_params.join("\n")
        : initialState.follow_params ?? "";

      setValuesState({
        ...initialState,
        follow_params: followParams,
      });
      setCustomParams(initialState.custom_params || []);
    }
  }, [initialState]);

  // Wrapper around setValue that only persists if not using initialState
  const setValues = React.useCallback(
    (update: Partial<Record<string, any>>) => {
      setValuesState((prev) => ({ ...prev, ...update }));
      if (!initialState) {
        setPersistentValues(update);
      }
    },
    [initialState, setPersistentValues],
  );

  // Reset to defaults (clears localStorage)
  const resetValues = React.useCallback(() => {
    setValuesState(defaults);
    setCustomParams([]);
    resetPersistent();
  }, [defaults, resetPersistent]);

  const handleChange = (name: string, value: any) => {
    setValues({ [name]: value });
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    SWEEP1D_FIELDS.forEach((field) => {
      const value = (values as any)[field.name];

      if (
        field.required &&
        (value === undefined || value === null || value === "")
      ) {
        newErrors[field.name] = "This field is required";
      }

      if (field.type === "number" && value !== undefined && value !== "") {
        if (field.min !== undefined && value < field.min) {
          newErrors[field.name] = `Value must be at least ${field.min}`;
        }
        if (field.max !== undefined && value > field.max) {
          newErrors[field.name] = `Value must be at most ${field.max}`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const serialize = (): Sweep1DParameters => {
    const v = values as any;
    return {
      sweep_name: v.sweep_name,
      set_param: v.set_param,
      start: v.start,
      stop: v.stop,
      step: v.step,
      bidirectional: v.bidirectional,
      continual: v.continual,
      x_axis_time: v.x_axis_time,
      err: v.err,
      back_multiplier: v.back_multiplier,
      inter_delay: v.inter_delay,
      save_data: v.save_data,
      plot_data: v.plot_data,
      plot_bin: v.plot_bin,
      suppress_output: v.suppress_output,
      follow_params: v.follow_params
        ? v.follow_params
            .split("\n")
            .map((p: string) => p.trim())
            .filter((p: string) => p)
        : [],
      custom_params: customParams.filter((p) => p.key.trim() !== ""),
    };
  };

  const handleGenerate = () => {
    // Validate for error display only, don't block generation
    validate();

    const params = serialize();
    onGenerate(params);
  };

  const handleAddToQueue = () => {
    if (!onAddToQueue) return;

    // Validate for error display only
    validate();

    const params = serialize();
    onAddToQueue(params);
  };

  return (
    <div className="qmeasure-form">
      <h3>Sweep1D - Single Parameter Sweep</h3>
      <p className="qmeasure-form-description">
        Sweep one parameter while tracking others.
      </p>

      {SWEEP1D_FIELDS.map((field) => (
        <FormInput
          key={field.name}
          field={field}
          value={(values as any)[field.name]}
          onChange={handleChange}
          error={errors[field.name]}
        />
      ))}

      <CustomParams value={customParams} onChange={setCustomParams} />

      <div className="qmeasure-form-actions">
        <button
          className="qmeasure-button-secondary qmeasure-button-small"
          onClick={resetValues}
          type="button"
        >
          Reset to Defaults
        </button>
        {onAddToQueue && (
          <button
            className="qmeasure-button-secondary"
            onClick={handleAddToQueue}
            type="button"
          >
            Add to Queue
          </button>
        )}
        <button className="qmeasure-button" onClick={handleGenerate}>
          Generate Code
        </button>
      </div>
    </div>
  );
};
