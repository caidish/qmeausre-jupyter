/**
 * Form component for Sweep2D parameters
 */

import React, { useState } from 'react';
import { FormInput } from './FormInput';
import { FormField, Sweep2DParameters } from '../types';

interface Sweep2DFormProps {
  onGenerate: (params: Sweep2DParameters) => void;
}

const SWEEP2D_FIELDS: FormField[] = [
  {
    name: 'sweep_name',
    label: 'Sweep Name',
    type: 'text',
    default: 's_2D',
    help: 'Variable name for the sweep object (default: s_2D)'
  },
  // Inner sweep
  {
    name: 'in_param',
    label: 'Inner Parameter',
    type: 'text',
    required: true,
    group: 'Inner Sweep',
    help: 'e.g., gate.voltage'
  },
  {
    name: 'in_start',
    label: 'Inner Start',
    type: 'number',
    required: true,
    group: 'Inner Sweep'
  },
  {
    name: 'in_stop',
    label: 'Inner Stop',
    type: 'number',
    required: true,
    group: 'Inner Sweep'
  },
  {
    name: 'in_step',
    label: 'Inner Step',
    type: 'number',
    required: true,
    group: 'Inner Sweep'
  },
  // Outer sweep
  {
    name: 'out_param',
    label: 'Outer Parameter',
    type: 'text',
    required: true,
    group: 'Outer Sweep',
    help: 'e.g., magnet.field'
  },
  {
    name: 'out_start',
    label: 'Outer Start',
    type: 'number',
    required: true,
    group: 'Outer Sweep'
  },
  {
    name: 'out_stop',
    label: 'Outer Stop',
    type: 'number',
    required: true,
    group: 'Outer Sweep'
  },
  {
    name: 'out_step',
    label: 'Outer Step',
    type: 'number',
    required: true,
    group: 'Outer Sweep'
  },
  // Additional parameters
  {
    name: 'inter_delay',
    label: 'Inter Delay',
    type: 'number',
    default: 0.1,
    min: 0,
    unit: 's',
    help: 'Delay between inner sweep points'
  },
  {
    name: 'outer_delay',
    label: 'Outer Delay',
    type: 'number',
    default: 0.1,
    min: 0,
    unit: 's',
    help: 'Delay between outer sweep points'
  },
  {
    name: 'out_ministeps',
    label: 'Outer Mini-steps',
    type: 'number',
    default: 1,
    min: 1,
    help: 'Steps to reach outer setpoint'
  },
  {
    name: 'err',
    label: 'Error Tolerance',
    type: 'number',
    default: 0.01,
    min: 0
  },
  {
    name: 'back_multiplier',
    label: 'Back Multiplier',
    type: 'number',
    default: 1,
    help: 'Step scale factor'
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
    help: 'Enter one parameter per line'
  },
  {
    name: 'suppress_output',
    label: 'Suppress Output',
    type: 'boolean',
    default: false
  }
];

export const Sweep2DForm: React.FC<Sweep2DFormProps> = ({ onGenerate }) => {
  // Initialize form with default values
  const [values, setValues] = useState<Record<string, any>>(() => {
    const defaults: Record<string, any> = {};
    SWEEP2D_FIELDS.forEach(field => {
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

    SWEEP2D_FIELDS.forEach(field => {
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
    const params: Sweep2DParameters = {
      sweep_name: values.sweep_name,
      in_param: values.in_param,
      in_start: values.in_start,
      in_stop: values.in_stop,
      in_step: values.in_step,
      out_param: values.out_param,
      out_start: values.out_start,
      out_stop: values.out_stop,
      out_step: values.out_step,
      inter_delay: values.inter_delay,
      outer_delay: values.outer_delay,
      out_ministeps: values.out_ministeps,
      err: values.err,
      back_multiplier: values.back_multiplier,
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

  // Group fields by their group property
  const groupedFields = SWEEP2D_FIELDS.reduce((acc, field) => {
    const group = field.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {} as Record<string, FormField[]>);

  return (
    <div className="qmeasure-form">
      <h3>Sweep2D - 2D Parameter Sweep</h3>
      <p className="qmeasure-form-description">
        Sweep two parameters in a nested fashion (outer and inner loops).
      </p>

      {Object.entries(groupedFields).map(([group, fields]) => (
        <div key={group} className="qmeasure-form-section">
          {group !== 'Other' && <h4 className="qmeasure-form-section-title">{group}</h4>}
          {fields.map(field => (
            <FormInput
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={handleChange}
              error={errors[field.name]}
            />
          ))}
        </div>
      ))}

      <button className="qmeasure-button" onClick={handleGenerate}>
        Generate Code
      </button>
    </div>
  );
};
