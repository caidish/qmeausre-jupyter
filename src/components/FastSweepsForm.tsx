/**
 * Form component for Fast Sweeps (Sweepto and GateLeakage)
 */

import React, { useState } from "react";
import { FormInput } from "./FormInput";
import { FormField, SweeptoParameters, GateLeakageParameters } from "../types";
import {
  usePersistentForm,
  getDefaultValues,
} from "../hooks/usePersistentForm";

interface FastSweepsFormProps {
  onGenerate: (params: SweeptoParameters | GateLeakageParameters) => void;
  initialState?: Partial<SweeptoParameters | GateLeakageParameters>;
  onAddToQueue?: (params: SweeptoParameters | GateLeakageParameters) => void;
}

type FastSweepMode = "sweepto" | "gateleakage";

// Form fields for Sweepto
const SWEEPTO_FIELDS: FormField[] = [
  {
    name: "sweep_name",
    label: "Sweep Name",
    type: "text",
    default: "s_to",
    help: "Variable name for the sweep object (default: s_to)",
  },
  {
    name: "parameter_path",
    label: "Parameter",
    type: "text",
    required: true,
    help: "Parameter to sweep (e.g., gate.voltage)",
  },
  {
    name: "setpoint",
    label: "Setpoint",
    type: "number",
    required: true,
    help: "Target value to sweep to",
  },
  {
    name: "step",
    label: "Step Size",
    type: "number",
    required: true,
    help: "Step size for the sweep",
  },
  {
    name: "save_data",
    label: "Save to Database",
    type: "boolean",
    default: false,
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
];

// Form fields for GateLeakage
const GATELEAKAGE_FIELDS: FormField[] = [
  {
    name: "sweep_name",
    label: "Sweep Name",
    type: "text",
    default: "s_gate",
    help: "Variable name for the sweep object (default: s_gate)",
  },
  {
    name: "set_param",
    label: "Set Parameter",
    type: "text",
    required: true,
    help: "Parameter to sweep (e.g., gate.voltage)",
  },
  {
    name: "track_param",
    label: "Track Parameter",
    type: "text",
    required: true,
    help: "Parameter to monitor (e.g., current_amp.current)",
  },
  {
    name: "max_current",
    label: "Max Current",
    type: "number",
    required: true,
    unit: "A",
    help: "Maximum allowed current",
  },
  {
    name: "limit",
    label: "Limit",
    type: "number",
    required: true,
    help: "Voltage limit",
  },
  {
    name: "step",
    label: "Step Size",
    type: "number",
    required: true,
    help: "Step size for the sweep",
  },
  {
    name: "inter_delay",
    label: "Inter Delay",
    type: "number",
    default: 0.01,
    min: 0,
    unit: "s",
    help: "Time to wait between data points",
  },
  {
    name: "save_data",
    label: "Save to Database",
    type: "boolean",
    default: false,
  },
  {
    name: "plot_data",
    label: "Live Plotting",
    type: "boolean",
    default: true,
  },
];

export const FastSweepsForm: React.FC<FastSweepsFormProps> = ({
  onGenerate,
  initialState,
  onAddToQueue,
}) => {
  const [mode, setMode] = useState<FastSweepMode>("sweepto");

  // Determine which fields to use based on mode
  const fields = mode === "sweepto" ? SWEEPTO_FIELDS : GATELEAKAGE_FIELDS;
  const defaults = getDefaultValues(fields);
  const storageKey = mode === "sweepto" ? "qmeasure:sweepto" : "qmeasure:gateleakage";

  const [persistentValues, setPersistentValues, resetPersistent] =
    usePersistentForm(storageKey, defaults);

  const [values, setValuesState] = useState<Record<string, any>>(
    initialState || persistentValues,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when initialState changes (for editing queued sweeps)
  React.useEffect(() => {
    if (initialState) {
      // Detect mode from initialState structure
      setMode("track_param" in initialState ? "gateleakage" : "sweepto");
      setValuesState(initialState);
    }
  }, [initialState]);

  // Update form when mode changes
  React.useEffect(() => {
    if (!initialState) {
      const newDefaults = getDefaultValues(fields);
      setValuesState(newDefaults);
    }
  }, [mode, initialState]);

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
    const newDefaults = getDefaultValues(fields);
    setValuesState(newDefaults);
    resetPersistent();
  }, [fields, resetPersistent]);

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

    fields.forEach((field) => {
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

  const serialize = (): SweeptoParameters | GateLeakageParameters => {
    const v = values as any;

    if (mode === "sweepto") {
      return {
        sweep_name: v.sweep_name,
        parameter_path: v.parameter_path,
        setpoint: v.setpoint,
        step: v.step,
        save_data: v.save_data,
        plot_data: v.plot_data,
        plot_bin: v.plot_bin,
      } as SweeptoParameters;
    } else {
      return {
        sweep_name: v.sweep_name,
        set_param: v.set_param,
        track_param: v.track_param,
        max_current: v.max_current,
        limit: v.limit,
        step: v.step,
        inter_delay: v.inter_delay,
        save_data: v.save_data,
        plot_data: v.plot_data,
      } as GateLeakageParameters;
    }
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
      <h3>Fast Sweeps</h3>
      <p className="qmeasure-form-description">
        Quick sweep operations for rapid parameter changes and gate leakage testing.
      </p>

      {/* Mode selector */}
      <div className="qmeasure-form-section">
        <div className="qmeasure-form-group">
          <label className="qmeasure-form-label">Sweep Type</label>
          <select
            className="qmeasure-form-input"
            value={mode}
            onChange={(e) => setMode(e.target.value as FastSweepMode)}
          >
            <option value="sweepto">Sweepto (Quick sweep to setpoint)</option>
            <option value="gateleakage">GateLeakage (Gate limit test)</option>
          </select>
        </div>
      </div>

      {/* Dynamic fields based on mode */}
      {fields.map((field) => (
        <FormInput
          key={field.name}
          field={field}
          value={(values as any)[field.name]}
          onChange={handleChange}
          error={errors[field.name]}
        />
      ))}

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
