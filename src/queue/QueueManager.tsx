/**
 * Queue Manager - React component for managing sweep queue
 */

import React from "react";
import { useQueueStore } from "./queueStore";
import { QueueEntry } from "../types/queue";

interface QueueManagerProps {
  onEdit?: (entry: QueueEntry) => void;
  onInsertQueue?: () => void;
}

/**
 * Main Queue Manager component
 */
export const QueueManager: React.FC<QueueManagerProps> = ({
  onEdit,
  onInsertQueue,
}) => {
  const queueStoreHook = useQueueStore();
  const { entries, selectedId } = queueStoreHook.state;
  const { remove, move, clear, select } = queueStoreHook;

  const handleEdit = (entry: QueueEntry) => {
    select(entry.id);
    if (onEdit) {
      onEdit(entry);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this sweep from the queue?")) {
      remove(id);
    }
  };

  const handleDuplicate = (entry: QueueEntry) => {
    // Deep clone to avoid mutation of original entry
    const cloned = structuredClone
      ? structuredClone(entry)
      : JSON.parse(JSON.stringify(entry));

    // Update only the fields that should change for a duplicate
    cloned.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    cloned.name = `${cloned.name} (copy)`;
    cloned.createdAt = Date.now();
    cloned.modifiedAt = Date.now();

    // Import store directly to call addOrReplace
    const { getQueueStore } = require("./queueStore");
    const store = getQueueStore();
    store.addOrReplace(cloned);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      move(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < entries.length - 1) {
      move(index, index + 1);
    }
  };

  const handleClear = () => {
    if (entries.length === 0) {
      return;
    }
    if (confirm(`Clear all ${entries.length} sweep(s) from the queue?`)) {
      clear();
    }
  };

  const handleInsertQueue = () => {
    if (onInsertQueue) {
      onInsertQueue();
    }
  };

  const getSweepTypeLabel = (type: QueueEntry["sweepType"]): string => {
    const labels: Record<QueueEntry["sweepType"], string> = {
      sweep0d: "0D",
      sweep1d: "1D",
      sweep2d: "2D",
      simulsweep: "Simul",
      sweepto: "To",
      gateleakage: "Gate",
    };
    return labels[type] || type;
  };

  const getSweepTypeIcon = (type: QueueEntry["sweepType"]): string => {
    const icons: Record<QueueEntry["sweepType"], string> = {
      sweep0d: "⏱",
      sweep1d: "📊",
      sweep2d: "🗺",
      simulsweep: "⚡",
      sweepto: "🎯",
      gateleakage: "🚨",
    };
    return icons[type] || "📋";
  };

  if (entries.length === 0) {
    return (
      <div className="qmeasure-queue-manager">
        <div className="qmeasure-header">
          <h2>Queue Manager</h2>
          <p className="qmeasure-subtitle">No sweeps in queue</p>
        </div>
        <div className="qmeasure-queue-empty">
          <p>Use "Add to Queue" in Sweep Manager to build your queue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="qmeasure-queue-manager">
      <div className="qmeasure-header">
        <h2>Queue Manager</h2>
        <p className="qmeasure-subtitle">
          {entries.length} sweep{entries.length !== 1 ? "s" : ""} queued
        </p>
      </div>

      <div className="qmeasure-queue-list">
        {entries.map((entry: QueueEntry, index: number) => (
          <div
            key={entry.id}
            className={`qmeasure-queue-entry ${selectedId === entry.id ? "selected" : ""}`}
          >
            <div className="qmeasure-queue-entry-header">
              <span className="qmeasure-queue-entry-icon">
                {getSweepTypeIcon(entry.sweepType)}
              </span>
              <div className="qmeasure-queue-entry-info">
                <div className="qmeasure-queue-entry-name">{entry.name}</div>
                <div className="qmeasure-queue-entry-meta">
                  <span className="qmeasure-queue-entry-type">
                    {getSweepTypeLabel(entry.sweepType)}
                  </span>
                  {entry.database && (
                    <span className="qmeasure-queue-entry-db">
                      💾 {entry.database.database}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="qmeasure-queue-entry-actions">
              <button
                className="qmeasure-queue-action-btn"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                title="Move up"
              >
                ↑
              </button>
              <button
                className="qmeasure-queue-action-btn"
                onClick={() => handleMoveDown(index)}
                disabled={index === entries.length - 1}
                title="Move down"
              >
                ↓
              </button>
              <button
                className="qmeasure-queue-action-btn"
                onClick={() => handleEdit(entry)}
                title="Edit"
              >
                ✏️
              </button>
              <button
                className="qmeasure-queue-action-btn"
                onClick={() => handleDuplicate(entry)}
                title="Duplicate"
              >
                📋
              </button>
              <button
                className="qmeasure-queue-action-btn qmeasure-queue-action-delete"
                onClick={() => handleDelete(entry.id)}
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="qmeasure-queue-footer">
        <button
          className="qmeasure-button qmeasure-button-small"
          onClick={handleInsertQueue}
        >
          Insert Queue Code
        </button>
        <button
          className="qmeasure-button-secondary qmeasure-button-small"
          onClick={handleClear}
        >
          Clear Queue
        </button>
      </div>
    </div>
  );
};
