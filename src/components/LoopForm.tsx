/**
 * Form component for creating/editing loop entries
 */

import React, { useState } from "react";
import { QueueLoopEntry } from "../types/queue";

interface LoopFormProps {
  initialData?: Partial<QueueLoopEntry>;
  onSave: (data: Partial<QueueLoopEntry>) => void;
  onCancel: () => void;
}

export const LoopForm: React.FC<LoopFormProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialData?.name || "New Loop");
  const [loopKind, setLoopKind] = useState<'repeat' | 'values'>(
    initialData?.loopKind || 'repeat'
  );
  const [count, setCount] = useState(initialData?.count || 5);
  const [valuesText, setValuesText] = useState(
    initialData?.values?.join(", ") || ""
  );
  const [loopVarName, setLoopVarName] = useState(
    initialData?.loopVarName || "value"
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (loopKind === 'repeat') {
      if (count < 1) {
        newErrors.count = "Count must be at least 1";
      }
    } else {
      if (!valuesText.trim()) {
        newErrors.values = "Values list is required";
      }
      if (!loopVarName.trim()) {
        newErrors.loopVarName = "Variable name is required";
      }
      // Check variable name is valid Python identifier
      if (loopVarName && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(loopVarName)) {
        newErrors.loopVarName = "Invalid Python variable name";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const data: Partial<QueueLoopEntry> = {
      name,
      label: loopKind === 'repeat'
        ? `Repeat ${count}×`
        : `For ${loopVarName} in [${valuesText}]`,
      loopKind,
    };

    if (loopKind === 'repeat') {
      data.count = count;
    } else {
      // Parse values (split by comma, trim)
      data.values = valuesText
        .split(',')
        .map(v => v.trim())
        .filter(v => v);
      data.loopVarName = loopVarName;
    }

    onSave(data);
  };

  return (
    <div className="qmeasure-modal-content">
      <h3>{initialData ? 'Edit Loop' : 'Create Loop'}</h3>

      <div className="qmeasure-form-group">
        <label className="qmeasure-form-label">
          Loop Name<span className="qmeasure-required">*</span>
        </label>
        <input
          type="text"
          className="qmeasure-form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Temperature Scan"
        />
        {errors.name && (
          <div className="qmeasure-form-error">{errors.name}</div>
        )}
      </div>

      <div className="qmeasure-form-group">
        <label className="qmeasure-form-label">Loop Type</label>
        <select
          className="qmeasure-form-input"
          value={loopKind}
          onChange={(e) => setLoopKind(e.target.value as 'repeat' | 'values')}
        >
          <option value="repeat">Repeat N times</option>
          <option value="values">Iterate over values</option>
        </select>
      </div>

      {loopKind === 'repeat' ? (
        <div className="qmeasure-form-group">
          <label className="qmeasure-form-label">
            Repeat Count<span className="qmeasure-required">*</span>
          </label>
          <input
            type="number"
            className="qmeasure-form-input"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            min="1"
            step="1"
          />
          {errors.count && (
            <div className="qmeasure-form-error">{errors.count}</div>
          )}
          <div className="qmeasure-form-help">
            Number of times to repeat the loop body
          </div>
        </div>
      ) : (
        <>
          <div className="qmeasure-form-group">
            <label className="qmeasure-form-label">
              Variable Name<span className="qmeasure-required">*</span>
            </label>
            <input
              type="text"
              className="qmeasure-form-input"
              value={loopVarName}
              onChange={(e) => setLoopVarName(e.target.value)}
              placeholder="e.g., setpoint, voltage"
            />
            {errors.loopVarName && (
              <div className="qmeasure-form-error">{errors.loopVarName}</div>
            )}
            <div className="qmeasure-form-help">
              Python variable name for loop values
            </div>
          </div>

          <div className="qmeasure-form-group">
            <label className="qmeasure-form-label">
              Values<span className="qmeasure-required">*</span>
            </label>
            <input
              type="text"
              className="qmeasure-form-input"
              value={valuesText}
              onChange={(e) => setValuesText(e.target.value)}
              placeholder="e.g., 0.1, 0.2, 0.3, 0.4"
            />
            {errors.values && (
              <div className="qmeasure-form-error">{errors.values}</div>
            )}
            <div className="qmeasure-form-help">
              Comma-separated Python expressions (e.g., 1, 2, 3 or 'a', 'b', 'c')
            </div>
          </div>
        </>
      )}

      <div className="qmeasure-form-actions">
        <button
          className="qmeasure-button-secondary"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="qmeasure-button"
          onClick={handleSave}
          type="button"
        >
          {initialData ? 'Update' : 'Create'} Loop
        </button>
      </div>
    </div>
  );
};
