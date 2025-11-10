/**
 * Reusable form input components
 */

import React from 'react';
import { FormField } from '../types';

interface FormInputProps {
  field: FormField;
  value: any;
  onChange: (name: string, value: any) => void;
  error?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  field,
  value,
  onChange,
  error
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let newValue: any = e.target.value;

    // Convert to appropriate type
    if (field.type === 'number') {
      newValue = e.target.value === '' ? '' : Number(e.target.value);
    } else if (field.type === 'boolean') {
      newValue = (e.target as HTMLInputElement).checked;
    }

    onChange(field.name, newValue);
  };

  const renderInput = () => {
    switch (field.type) {
      case 'number':
        return (
          <input
            type="number"
            className="qmeasure-form-input"
            value={value ?? field.default ?? ''}
            onChange={handleChange}
            min={field.min}
            max={field.max}
            step="any"
            placeholder={field.default?.toString()}
          />
        );

      case 'boolean':
        return (
          <label className="qmeasure-checkbox-label">
            <input
              type="checkbox"
              className="qmeasure-checkbox"
              checked={value ?? field.default ?? false}
              onChange={handleChange}
            />
            <span>{field.label}</span>
          </label>
        );

      case 'select':
        return (
          <select
            className="qmeasure-form-input"
            value={value ?? field.default ?? ''}
            onChange={handleChange}
          >
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            className="qmeasure-form-input qmeasure-textarea"
            value={value ?? field.default ?? ''}
            onChange={handleChange}
            rows={3}
            placeholder={field.help}
          />
        );

      case 'text':
      default:
        return (
          <input
            type="text"
            className="qmeasure-form-input"
            value={value ?? field.default ?? ''}
            onChange={handleChange}
            placeholder={field.help}
          />
        );
    }
  };

  // For boolean fields, don't show separate label
  if (field.type === 'boolean') {
    return (
      <div className="qmeasure-form-group">
        {renderInput()}
        {field.help && <div className="qmeasure-form-help">{field.help}</div>}
        {error && <div className="qmeasure-form-error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="qmeasure-form-group">
      <label className="qmeasure-form-label">
        {field.label}
        {field.required && <span className="qmeasure-required">*</span>}
        {field.unit && <span className="qmeasure-unit"> ({field.unit})</span>}
      </label>
      {renderInput()}
      {field.help && <div className="qmeasure-form-help">{field.help}</div>}
      {error && <div className="qmeasure-form-error">{error}</div>}
    </div>
  );
};
