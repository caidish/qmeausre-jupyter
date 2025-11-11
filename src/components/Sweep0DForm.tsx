/**
 * Form component for Sweep0D parameters
 */

import React, { useState } from "react";
import { FormInput } from "./FormInput";
import { CustomParams, CustomParamEntry } from "./CustomParams";
import { FormField, Sweep0DParameters } from "../types";
import {
  usePersistentForm,
  getDefaultValues,
} from "../hooks/usePersistentForm";

interface Sweep0DFormProps {
  onGenerate: (params: Sweep0DParameters) => void;
  initialState?: Partial<Sweep0DParameters>;
  onAddToQueue?: (params: Sweep0DParameters) => void;
}

// Form field definitions for Sweep0D
const SWEEP0D_FIELDS: FormField[] = [
  {
    name: "sweep_name",
    label: "Sweep Name",
    type: "text",
    default: "s_0D",
    help: "Variable name for the sweep object (default: s_0D)",
  },
  {
    name: "max_time",
    label: "Max Time",
    type: "number",
    default: 60,
    min: 0,
    required: true,
    unit: "s",
    help: "Duration of the time-based measurement in seconds",
  },
  {
    name: "inter_delay",
    label: "Inter Delay",
    type: "number",
    default: 0.1,
    min: 0.001,
    unit: "s",
    help: "Time to wait between data points",
  },
  {
    name: "save_data",
    label: "Save to Database",
    type: "boolean",
    default: true,
    help: "Save measurement data to QCoDeS database",
  },
  {
    name: "plot_data",
    label: "Live Plotting",
    type: "boolean",
    default: true,
    help: "Enable real-time data plotting",
  },
  {
    name: "plot_bin",
    label: "Plot Bin Size",
    type: "number",
    default: 1,
    min: 1,
    help: "Number of points to collect before updating plot",
  },
  {
    name: "follow_params",
    label: "Parameters to Track",
    type: "textarea",
    default: "",
    help: "Enter parameters (e.g., dmm.voltage, keithley.current) one per line",
  },
  {
    name: "suppress_output",
    label: "Suppress Output",
    type: "boolean",
    default: false,
    help: "Suppress console output during measurement",
  },
];

export const Sweep0DForm: React.FC<Sweep0DFormProps> = ({
  onGenerate,
  initialState,
  onAddToQueue,
}) => {
  // If initialState is provided, use it directly without localStorage persistence
  // Otherwise use persistent form storage
  const defaults = getDefaultValues(SWEEP0D_FIELDS);
  const [persistentValues, setPersistentValues, resetPersistent] =
    usePersistentForm("qmeasure:sweep0d", defaults);

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
    // Clear error when field is modified
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

    SWEEP0D_FIELDS.forEach((field) => {
      const value = (values as any)[field.name];

      // Check required fields
      if (
        field.required &&
        (value === undefined || value === null || value === "")
      ) {
        newErrors[field.name] = "This field is required";
      }

      // Check number constraints
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

  const serialize = (): Sweep0DParameters => {
    const v = values as any;
    return {
      sweep_name: v.sweep_name,
      max_time: v.max_time,
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
      <h3>Sweep0D - Time-based Measurement</h3>
      <p className="qmeasure-form-description">
        Track parameters over time without sweeping any setpoints.
      </p>

      {SWEEP0D_FIELDS.map((field) => (
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
