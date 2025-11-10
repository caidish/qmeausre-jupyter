/**
 * Form component for Sweep0D parameters
 */

import React, { useState } from 'react';
import { FormInput } from './FormInput';
import { FormField, Sweep0DParameters } from '../types';

interface Sweep0DFormProps {
  onGenerate: (params: Sweep0DParameters) => void;
}

// Form field definitions for Sweep0D
const SWEEP0D_FIELDS: FormField[] = [
  {
    name: 'sweep_name',
    label: 'Sweep Name',
    type: 'text',
    default: 's_0D',
    help: 'Variable name for the sweep object (default: s_0D)'
  },
  {
    name: 'max_time',
    label: 'Max Time',
    type: 'number',
    default: 60,
    min: 0,
    required: true,
    unit: 's',
    help: 'Duration of the time-based measurement in seconds'
  },
  {
    name: 'inter_delay',
    label: 'Inter Delay',
    type: 'number',
    default: 0.1,
    min: 0.001,
    unit: 's',
    help: 'Time to wait between data points'
  },
  {
    name: 'save_data',
    label: 'Save to Database',
    type: 'boolean',
    default: true,
    help: 'Save measurement data to QCoDeS database'
  },
  {
    name: 'plot_data',
    label: 'Live Plotting',
    type: 'boolean',
    default: true,
    help: 'Enable real-time data plotting'
  },
  {
    name: 'plot_bin',
    label: 'Plot Bin Size',
    type: 'number',
    default: 1,
    min: 1,
    help: 'Number of points to collect before updating plot'
  },
  {
    name: 'follow_params',
    label: 'Parameters to Track',
    type: 'textarea',
    default: '',
    help: 'Enter parameters (e.g., dmm.voltage, keithley.current) one per line'
  },
  {
    name: 'suppress_output',
    label: 'Suppress Output',
    type: 'boolean',
    default: false,
    help: 'Suppress console output during measurement'
  }
];

export const Sweep0DForm: React.FC<Sweep0DFormProps> = ({ onGenerate }) => {
  // Initialize form with default values
  const [values, setValues] = useState<Record<string, any>>(() => {
    const defaults: Record<string, any> = {};
    SWEEP0D_FIELDS.forEach(field => {
      if (field.default !== undefined) {
        defaults[field.name] = field.default;
      }
    });
    return defaults;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    SWEEP0D_FIELDS.forEach(field => {
      const value = values[field.name];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        newErrors[field.name] = 'This field is required';
      }

      // Check number constraints
      if (field.type === 'number' && value !== undefined && value !== '') {
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

  const handleGenerate = () => {
    // Validate for error display only, don't block generation
    validate();

    // Build parameters - missing required fields will use _required placeholder in code generation
    const params: Sweep0DParameters = {
      sweep_name: values.sweep_name,
      max_time: values.max_time,
      inter_delay: values.inter_delay,
      save_data: values.save_data,
      plot_data: values.plot_data,
      plot_bin: values.plot_bin,
      suppress_output: values.suppress_output,
      follow_params: values.follow_params
        ? values.follow_params.split('\n').map((p: string) => p.trim()).filter((p: string) => p)
        : []
    };

    onGenerate(params);
  };

  return (
    <div className="qmeasure-form">
      <h3>Sweep0D - Time-based Measurement</h3>
      <p className="qmeasure-form-description">
        Track parameters over time without sweeping any setpoints.
      </p>

      {SWEEP0D_FIELDS.map(field => (
        <FormInput
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={handleChange}
          error={errors[field.name]}
        />
      ))}

      <button
        className="qmeasure-button"
        onClick={handleGenerate}
      >
        Generate Code
      </button>
    </div>
  );
};
