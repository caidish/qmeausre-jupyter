/**
 * Form component for Sweep2D parameters
 */

import React, { useState } from "react";
import { FormInput } from "./FormInput";
import { CustomParams, CustomParamEntry } from "./CustomParams";
import { FormField, Sweep2DParameters } from "../types";
import {
  usePersistentForm,
  getDefaultValues,
} from "../hooks/usePersistentForm";

interface Sweep2DFormProps {
  onGenerate: (params: Sweep2DParameters) => void;
  initialState?: Partial<Sweep2DParameters>;
  onAddToQueue?: (params: Sweep2DParameters) => void;
}

const SWEEP2D_FIELDS: FormField[] = [
  {
    name: "sweep_name",
    label: "Sweep Name",
    type: "text",
    default: "s_2D",
    help: "Variable name for the sweep object (default: s_2D)",
  },
  // Inner sweep
  {
    name: "in_param",
    label: "Inner Parameter",
    type: "text",
    required: true,
    group: "Inner Sweep",
    help: "e.g., gate.voltage",
  },
  {
    name: "in_start",
    label: "Inner Start",
    type: "number",
    required: true,
    group: "Inner Sweep",
  },
  {
    name: "in_stop",
    label: "Inner Stop",
    type: "number",
    required: true,
    group: "Inner Sweep",
  },
  {
    name: "in_step",
    label: "Inner Step",
    type: "number",
    required: true,
    group: "Inner Sweep",
  },
  // Outer sweep
  {
    name: "out_param",
    label: "Outer Parameter",
    type: "text",
    required: true,
    group: "Outer Sweep",
    help: "e.g., magnet.field",
  },
  {
    name: "out_start",
    label: "Outer Start",
    type: "number",
    required: true,
    group: "Outer Sweep",
  },
  {
    name: "out_stop",
    label: "Outer Stop",
    type: "number",
    required: true,
    group: "Outer Sweep",
  },
  {
    name: "out_step",
    label: "Outer Step",
    type: "number",
    required: true,
    group: "Outer Sweep",
  },
  // Additional parameters
  {
    name: "inter_delay",
    label: "Inter Delay",
    type: "number",
    default: 0.1,
    min: 0,
    unit: "s",
    help: "Delay between inner sweep points",
  },
  {
    name: "outer_delay",
    label: "Outer Delay",
    type: "number",
    default: 0.1,
    min: 0,
    unit: "s",
    help: "Delay between outer sweep points",
  },
  {
    name: "out_ministeps",
    label: "Outer Mini-steps",
    type: "number",
    default: 1,
    min: 1,
    help: "Steps to reach outer setpoint",
  },
  {
    name: "err",
    label: "Error Tolerance",
    type: "number",
    default: 0.01,
    min: 0,
  },
  {
    name: "back_multiplier",
    label: "Back Multiplier",
    type: "number",
    default: 1,
    help: "Step scale factor",
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
    help: "Enter one parameter per line",
  },
  {
    name: "suppress_output",
    label: "Suppress Output",
    type: "boolean",
    default: false,
  },
];

export const Sweep2DForm: React.FC<Sweep2DFormProps> = ({
  onGenerate,
  initialState,
  onAddToQueue,
}) => {
  // If initialState is provided, use it directly without localStorage persistence
  // Otherwise use persistent form storage
  const defaults = getDefaultValues(SWEEP2D_FIELDS);
  const [persistentValues, setPersistentValues, resetPersistent] =
    usePersistentForm("qmeasure:sweep2d", defaults);

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

    SWEEP2D_FIELDS.forEach((field) => {
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

  const serialize = (): Sweep2DParameters => {
    const v = values as any;
    return {
      sweep_name: v.sweep_name,
      in_param: v.in_param,
      in_start: v.in_start,
      in_stop: v.in_stop,
      in_step: v.in_step,
      out_param: v.out_param,
      out_start: v.out_start,
      out_stop: v.out_stop,
      out_step: v.out_step,
      inter_delay: v.inter_delay,
      outer_delay: v.outer_delay,
      out_ministeps: v.out_ministeps,
      err: v.err,
      back_multiplier: v.back_multiplier,
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

  // Group fields by their group property
  const groupedFields = SWEEP2D_FIELDS.reduce(
    (acc, field) => {
      const group = field.group || "Other";
      if (!acc[group]) acc[group] = [];
      acc[group].push(field);
      return acc;
    },
    {} as Record<string, FormField[]>,
  );

  return (
    <div className="qmeasure-form">
      <h3>Sweep2D - 2D Parameter Sweep</h3>
      <p className="qmeasure-form-description">
        Sweep two parameters in a nested fashion (outer and inner loops).
      </p>

      {Object.entries(groupedFields).map(([group, fields]) => (
        <div key={group} className="qmeasure-form-section">
          {group !== "Other" && (
            <h4 className="qmeasure-form-section-title">{group}</h4>
          )}
          {fields.map((field) => (
            <FormInput
              key={field.name}
              field={field}
              value={(values as any)[field.name]}
              onChange={handleChange}
              error={errors[field.name]}
            />
          ))}
        </div>
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
