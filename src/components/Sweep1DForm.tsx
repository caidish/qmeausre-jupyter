/**
 * Form component for Sweep1D parameters
 */

import React, { useState } from 'react';
import { FormInput } from './FormInput';
import { FormField, Sweep1DParameters } from '../types';

interface Sweep1DFormProps {
  onGenerate: (params: Sweep1DParameters) => void;
}

const SWEEP1D_FIELDS: FormField[] = [
  {
    name: 'sweep_name',
    label: 'Sweep Name',
    type: 'text',
    default: 's_1D',
    help: 'Variable name for the sweep object (default: s_1D)'
  },
  {
    name: 'set_param',
    label: 'Parameter to Sweep',
    type: 'text',
    required: true,
    help: 'Enter parameter path (e.g., keithley.voltage)'
  },
  {
    name: 'start',
    label: 'Start Value',
    type: 'number',
    required: true,
    help: 'Starting value for the sweep'
  },
  {
    name: 'stop',
    label: 'Stop Value',
    type: 'number',
    required: true,
    help: 'Ending value for the sweep'
  },
  {
    name: 'step',
    label: 'Step Size',
    type: 'number',
    required: true,
    help: 'Step size (sign will auto-adjust based on start/stop)'
  },
  {
    name: 'bidirectional',
    label: 'Bidirectional Sweep',
    type: 'boolean',
    default: false,
    help: 'Sweep back and forth'
  },
  {
    name: 'continual',
    label: 'Continuous Sweep',
    type: 'boolean',
    default: false,
    help: 'Continue sweeping indefinitely'
  },
  {
    name: 'x_axis_time',
    label: 'X-Axis',
    type: 'select',
    default: 0,
    options: [
      { value: 0, label: 'Parameter Value' },
      { value: 1, label: 'Time' }
    ],
    help: 'What to plot on the x-axis'
  },
  {
    name: 'inter_delay',
    label: 'Inter Delay',
    type: 'number',
    default: 0.1,
    min: 0,
    unit: 's',
    help: 'Time to wait between data points'
  },
  {
    name: 'err',
    label: 'Error Tolerance',
    type: 'number',
    default: 0.01,
    min: 0,
    help: 'Tolerance for rounding errors'
  },
  {
    name: 'back_multiplier',
    label: 'Back Multiplier',
    type: 'number',
    default: 1,
    help: 'Step size multiplier after direction change'
  },
  {
    name: 'save_data',
    label: 'Save to Database',
    type: 'boolean',
    default: true
  },
  {
    name: 'plot_data',
    label: 'Live Plotting',
    type: 'boolean',
    default: true
  },
  {
    name: 'plot_bin',
    label: 'Plot Bin Size',
    type: 'number',
    default: 1,
    min: 1
  },
  {
    name: 'follow_params',
    label: 'Follow Parameters',
    type: 'textarea',
    default: '',
    help: 'Enter one parameter per line (e.g., dmm.voltage)'
  },
  {
    name: 'suppress_output',
    label: 'Suppress Output',
    type: 'boolean',
    default: false
  }
];

export const Sweep1DForm: React.FC<Sweep1DFormProps> = ({ onGenerate }) => {
  // Initialize form with default values
  const [values, setValues] = useState<Record<string, any>>(() => {
    const defaults: Record<string, any> = {};
    SWEEP1D_FIELDS.forEach(field => {
      if (field.default !== undefined) {
        defaults[field.name] = field.default;
      }
    });
    return defaults;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
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

    SWEEP1D_FIELDS.forEach(field => {
      const value = values[field.name];

      if (field.required && (value === undefined || value === null || value === '')) {
        newErrors[field.name] = 'This field is required';
      }

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
    const params: Sweep1DParameters = {
      sweep_name: values.sweep_name,
      set_param: values.set_param,
      start: values.start,
      stop: values.stop,
      step: values.step,
      bidirectional: values.bidirectional,
      continual: values.continual,
      x_axis_time: values.x_axis_time,
      err: values.err,
      back_multiplier: values.back_multiplier,
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
      <h3>Sweep1D - Single Parameter Sweep</h3>
      <p className="qmeasure-form-description">
        Sweep one parameter while tracking others.
      </p>

      {SWEEP1D_FIELDS.map(field => (
        <FormInput
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={handleChange}
          error={errors[field.name]}
        />
      ))}

      <button className="qmeasure-button" onClick={handleGenerate}>
        Generate Code
      </button>
    </div>
  );
};
