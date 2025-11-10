/**
 * Form component for database initialization parameters
 */

import React, { useState } from 'react';
import { FormInput } from './FormInput';
import { FormField } from '../types';

interface DatabaseFormProps {
  sweepName: string;
  onGenerate: (code: string) => void;
}

interface DatabaseParameters {
  database_name: string;
  exp_name: string;
  sample_name: string;
}

// Form field definitions for database initialization
const DATABASE_FIELDS: FormField[] = [
  {
    name: 'database_name',
    label: 'Database Name',
    type: 'text',
    default: 'measurement.db',
    required: true,
    help: 'QCoDeS database file name (e.g., Test_database.db)'
  },
  {
    name: 'exp_name',
    label: 'Experiment Name',
    type: 'text',
    default: 'experiment',
    required: true,
    help: 'Experiment name for database (e.g., gate_sweep)'
  },
  {
    name: 'sample_name',
    label: 'Sample Name',
    type: 'text',
    default: 'sample',
    required: true,
    help: 'Sample name for database (e.g., device_A)'
  }
];

export const DatabaseForm: React.FC<DatabaseFormProps> = ({ sweepName, onGenerate }) => {
  // Initialize form with default values
  const [values, setValues] = useState<Record<string, any>>(() => {
    const defaults: Record<string, any> = {};
    DATABASE_FIELDS.forEach(field => {
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

    DATABASE_FIELDS.forEach(field => {
      const value = values[field.name];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        newErrors[field.name] = 'This field is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = () => {
    // Validate for error display only, don't block generation
    validate();

    const databaseName = values.database_name || '_required';
    const expName = values.exp_name || '_required';
    const sampleName = values.sample_name || '_required';

    const code = `# Database initialization
try:
    # Make sure database_name and the path are set to the correct values!
    database_name = "${databaseName}"
    exp_name = "${expName}"
    sample_name = "${sampleName}"
    init_database(database_name, exp_name, sample_name, ${sweepName})
except:
    print("Error opening database")`;

    onGenerate(code);
  };

  return (
    <div className="qmeasure-form">
      <h3>Database Initialization</h3>
      <p className="qmeasure-form-description">
        Configure database settings for saving measurement data.
        Current sweep: <strong>{sweepName}</strong>
      </p>

      {DATABASE_FIELDS.map(field => (
        <FormInput
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={handleChange}
          error={errors[field.name]}
        />
      ))}

      <button
        className="qmeasure-generate-button"
        onClick={handleGenerate}
      >
        Generate Database Init Code
      </button>
    </div>
  );
};
