/**
 * Form component for creating/editing function entries
 */

import React, { useState } from "react";
import { QueueFunctionEntry } from "../types/queue";
import { validatePythonSyntax } from "../queue/exportHelpers";

interface FunctionFormProps {
  initialData?: Partial<QueueFunctionEntry>;
  onSave: (data: Partial<QueueFunctionEntry>) => void;
  onCancel: () => void;
}

// Predefined templates
const TEMPLATES: Array<{
  id: string;
  label: string;
  description: string;
  code: string;
}> = [
  {
    id: "pause",
    label: "Pause",
    description: "Pause execution for specified seconds",
    code: `import time\ntime.sleep(10)  # seconds`,
  },
  {
    id: "print",
    label: "Print Message",
    description: "Print a message to console",
    code: `print("Checkpoint reached")`,
  },
  {
    id: "custom",
    label: "Custom Code",
    description: "Write your own Python code",
    code: `# Your custom code here\npass`,
  },
];

export const FunctionForm: React.FC<FunctionFormProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialData?.name || "Custom Function");
  const [selectedTemplate, setSelectedTemplate] = useState(
    initialData?.templateId || "custom"
  );
  const [pythonCode, setPythonCode] = useState(
    initialData?.pythonCode || TEMPLATES[3].code
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setPythonCode(template.code);
      setName(template.label);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!pythonCode.trim()) {
      newErrors.pythonCode = "Python code is required";
    } else {
      // Basic syntax validation
      const syntaxError = validatePythonSyntax(pythonCode);
      if (syntaxError) {
        newErrors.pythonCode = `Syntax error: ${syntaxError}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const data: Partial<QueueFunctionEntry> = {
      name,
      label: name,
      pythonCode,
      templateId: selectedTemplate,
    };

    onSave(data);
  };

  return (
    <div className="qmeasure-modal-content">
      <h3>{initialData ? 'Edit Function' : 'Add Function'}</h3>

      <div className="qmeasure-form-group">
        <label className="qmeasure-form-label">Template</label>
        <select
          className="qmeasure-form-input"
          value={selectedTemplate}
          onChange={(e) => handleTemplateChange(e.target.value)}
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <div className="qmeasure-form-help">
          {TEMPLATES.find((t) => t.id === selectedTemplate)?.description}
        </div>
      </div>

      <div className="qmeasure-form-group">
        <label className="qmeasure-form-label">
          Function Name<span className="qmeasure-required">*</span>
        </label>
        <input
          type="text"
          className="qmeasure-form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Pause 10s"
        />
        {errors.name && (
          <div className="qmeasure-form-error">{errors.name}</div>
        )}
      </div>

      <div className="qmeasure-form-group">
        <label className="qmeasure-form-label">
          Python Code<span className="qmeasure-required">*</span>
        </label>
        <textarea
          className="qmeasure-form-input qmeasure-code-editor"
          value={pythonCode}
          onChange={(e) => setPythonCode(e.target.value)}
          rows={10}
          spellCheck={false}
          style={{ fontFamily: 'monospace', fontSize: '13px' }}
        />
        {errors.pythonCode && (
          <div className="qmeasure-form-error">{errors.pythonCode}</div>
        )}
        <div className="qmeasure-form-help">
          Python code to execute (will be wrapped in a function)
        </div>
      </div>

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
          {initialData ? 'Update' : 'Add'} Function
        </button>
      </div>
    </div>
  );
};
