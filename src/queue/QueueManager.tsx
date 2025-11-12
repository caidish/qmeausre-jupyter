/**
 * Queue Manager - React component for managing sweep queue
 * Enhanced to support loops and functions
 */

import React from "react";
import { useQueueStore } from "./queueStore";
import { QueueEntry, QueueItem, QueueSweepEntry, QueueLoopEntry, QueueFunctionEntry, isLoopEntry, isSweepEntry } from "../types/queue";
import { QueueItemComponent } from "./QueueItem";
import { LoopForm } from "../components/LoopForm";
import { FunctionForm } from "../components/FunctionForm";

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
  const { entries, selectedId, targetLoopId } = queueStoreHook.state;
  const { remove, move, clear, select, addLoop, updateLoop, addToLoop, removeFromLoop, moveWithinLoop, setTargetLoop } = queueStoreHook;

  // Modal state
  const [showLoopModal, setShowLoopModal] = React.useState(false);
  const [showFunctionModal, setShowFunctionModal] = React.useState(false);
  const [showAddToLoopModal, setShowAddToLoopModal] = React.useState(false);
  const [currentLoopForAdding, setCurrentLoopForAdding] = React.useState<string | null>(null);
  const [editingLoop, setEditingLoop] = React.useState<QueueLoopEntry | null>(null);
  const [editingFunction, setEditingFunction] = React.useState<QueueFunctionEntry | null>(null);

  const handleEdit = (item: QueueItem, path: string[]) => {
    // Only edit sweep entries through the SweepManager
    if (isSweepEntry(item)) {
      select(item.id);
      if (onEdit) {
        onEdit(item);
      }
    } else if (isLoopEntry(item)) {
      setEditingLoop(item);
      setShowLoopModal(true);
    } else {
      // Function entry
      setEditingFunction(item);
      setShowFunctionModal(true);
    }
  };

  const handleDelete = (id: string, path: string[]) => {
    if (path.length === 0) {
      // Top-level item
      if (confirm("Delete this entry from the queue?")) {
        remove(id);
      }
    } else {
      // Nested item - remove from parent loop
      const parentId = path[path.length - 1];
      if (confirm("Delete this entry from the loop?")) {
        removeFromLoop(parentId, id);
      }
    }
  };

  const handleDuplicate = (item: QueueItem, path: string[]) => {
    // Deep clone to avoid mutation of original entry
    const cloned = structuredClone
      ? structuredClone(item)
      : JSON.parse(JSON.stringify(item));

    // Update only the fields that should change for a duplicate
    cloned.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    cloned.name = `${cloned.name} (copy)`;
    cloned.createdAt = Date.now();
    cloned.modifiedAt = Date.now();

    // Import store directly to call addOrReplace
    const { getQueueStore } = require("./queueStore");
    const store = getQueueStore();

    // Check if item has a parent (is nested)
    if (path.length > 0) {
      // Item is nested - add to the same parent loop
      const parentId = path[path.length - 1];
      store.addToLoop(parentId, cloned);
    } else {
      // Item is at root - add to root
      if (isSweepEntry(cloned)) {
        store.addOrReplace(cloned);
      } else if (isLoopEntry(cloned)) {
        store.addLoop(cloned);
      } else {
        store.addOrReplace(cloned);
      }
    }
  };

  const handleMoveUp = (index: number, path: string[]) => {
    if (index === 0) return;

    if (path.length === 0) {
      // Top-level item
      move(index, index - 1);
    } else {
      // Nested item - move within parent loop
      const parentId = path[path.length - 1];
      moveWithinLoop(parentId, index, index - 1);
    }
  };

  const handleMoveDown = (index: number, path: string[]) => {
    if (path.length === 0) {
      // Top-level item
      if (index < entries.length - 1) {
        move(index, index + 1);
      }
    } else {
      // Nested item - move within parent loop
      const parentId = path[path.length - 1];
      const parentEntry = queueStoreHook.getEntry(parentId);
      if (parentEntry && isLoopEntry(parentEntry) && index < parentEntry.body.length - 1) {
        moveWithinLoop(parentId, index, index + 1);
      }
    }
  };

  const handleClear = () => {
    if (entries.length === 0) {
      return;
    }
    if (confirm(`Clear all ${entries.length} entry(s) from the queue?`)) {
      clear();
    }
  };

  const handleInsertQueue = () => {
    if (onInsertQueue) {
      onInsertQueue();
    }
  };

  const handleAddLoop = () => {
    setEditingLoop(null);
    setShowLoopModal(true);
  };

  const handleSaveLoop = (data: Partial<QueueLoopEntry>) => {
    const loopEntry: QueueLoopEntry = {
      id: editingLoop?.id || `loop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      queueType: 'loop',
      name: data.name || 'New Loop',
      label: data.label || '',
      loopKind: data.loopKind || 'repeat',
      count: data.count,
      values: data.values,
      loopVarName: data.loopVarName,
      body: editingLoop?.body || [],
      createdAt: editingLoop?.createdAt || Date.now(),
      modifiedAt: Date.now(),
    };

    const { getQueueStore } = require("./queueStore");
    const store = getQueueStore();

    if (editingLoop) {
      store.updateLoop(loopEntry.id, loopEntry);
    } else {
      store.addLoop(loopEntry);
    }

    setShowLoopModal(false);
    setEditingLoop(null);
  };

  const handleAddFunction = () => {
    setEditingFunction(null);
    setShowFunctionModal(true);
  };

  const handleSaveFunction = (data: Partial<QueueFunctionEntry>) => {
    const funcEntry: QueueFunctionEntry = {
      id: editingFunction?.id || `func_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      queueType: 'function',
      name: data.name || 'Custom Function',
      label: data.label || data.name || 'Custom Function',
      pythonCode: data.pythonCode || '',
      templateId: data.templateId,
      createdAt: editingFunction?.createdAt || Date.now(),
      modifiedAt: Date.now(),
    };

    const { getQueueStore } = require("./queueStore");
    const store = getQueueStore();

    // Check if we should add to a target loop
    const targetLoop = store.getTargetLoop();
    if (targetLoop && !editingFunction) {
      // Add to loop instead of root
      store.addToLoop(targetLoop, funcEntry);
      // Clear target loop after adding
      store.setTargetLoop(undefined);
    } else {
      store.addOrReplace(funcEntry);
    }

    setShowFunctionModal(false);
    setEditingFunction(null);
  };

  // Render queue content based on whether we have entries
  const renderQueueContent = () => {
    if (entries.length === 0) {
      return (
        <div className="qmeasure-queue-empty">
          <p>No entries in queue. Add sweeps, loops, or functions.</p>
        </div>
      );
    }

    return (
      <>
        {/* Target loop indicator */}
        {targetLoopId && (() => {
          const targetLoop = queueStoreHook.getEntry(targetLoopId);
          return targetLoop && isLoopEntry(targetLoop) ? (
            <div style={{
              padding: '8px 12px',
              margin: '8px 0',
              background: '#e8f4f8',
              border: '1px solid #4a9eff',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.9em'
            }}>
              <span>
                🎯 Adding to loop: <strong>{targetLoop.name}</strong>
              </span>
              <button
                className="qmeasure-button-small qmeasure-button-secondary"
                onClick={() => setTargetLoop(undefined)}
                style={{ marginLeft: '8px' }}
              >
                Clear Target
              </button>
            </div>
          ) : null;
        })()}

        <div className="qmeasure-queue-list">
          {entries.map((item, index) => (
            <QueueItemComponent
              key={item.id}
              item={item}
              depth={0}
              index={index}
              parentPath={[]}
              isSelected={selectedId === item.id}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onAddToLoop={isLoopEntry(item) ? (loopId) => {
                setCurrentLoopForAdding(loopId);
                setShowAddToLoopModal(true);
              } : undefined}
            />
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="qmeasure-queue-manager">
      <div className="qmeasure-queue-header">
        <h3>Sweep Queue ({entries.length})</h3>
        <div className="qmeasure-queue-actions">
          <button className="qmeasure-button-small" onClick={handleAddLoop}>
            + Loop
          </button>
          <button className="qmeasure-button-small" onClick={handleAddFunction}>
            + Function
          </button>
          {entries.length > 0 && (
            <>
              <button className="qmeasure-button-small qmeasure-button-secondary" onClick={handleClear}>
                Clear All
              </button>
              <button className="qmeasure-button" onClick={handleInsertQueue}>
                Insert Queue
              </button>
            </>
          )}
        </div>
      </div>

      {renderQueueContent()}

      {/* Loop modal */}
      {showLoopModal && (
        <div className="qmeasure-modal-overlay" onClick={() => setShowLoopModal(false)}>
          <div className="qmeasure-modal" onClick={(e) => e.stopPropagation()}>
            <LoopForm
              initialData={editingLoop || undefined}
              onSave={handleSaveLoop}
              onCancel={() => setShowLoopModal(false)}
            />
          </div>
        </div>
      )}

      {/* Function modal */}
      {showFunctionModal && (
        <div className="qmeasure-modal-overlay" onClick={() => setShowFunctionModal(false)}>
          <div className="qmeasure-modal" onClick={(e) => e.stopPropagation()}>
            <FunctionForm
              initialData={editingFunction || undefined}
              onSave={handleSaveFunction}
              onCancel={() => setShowFunctionModal(false)}
            />
          </div>
        </div>
      )}

      {/* Add to Loop modal */}
      {showAddToLoopModal && currentLoopForAdding && (
        <div className="qmeasure-modal-overlay" onClick={() => {
          setShowAddToLoopModal(false);
          setCurrentLoopForAdding(null);
        }}>
          <div className="qmeasure-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qmeasure-form">
              <h3>Add to Loop</h3>
              <p>Choose how to add items to this loop:</p>

              <div style={{ marginTop: '16px' }}>
                <button
                  className="qmeasure-button"
                  style={{ width: '100%', marginBottom: '8px' }}
                  onClick={() => {
                    // Set target loop and close modal - SweepManager will add to this loop
                    setTargetLoop(currentLoopForAdding);
                    setShowAddToLoopModal(false);
                    setCurrentLoopForAdding(null);
                    alert('Target loop set. Use "Add to Queue" in Sweep Manager to add sweeps to this loop. Click "Clear Target" to stop adding to this loop.');
                  }}
                >
                  Create New Sweep in Loop
                </button>

                <button
                  className="qmeasure-button"
                  style={{ width: '100%', marginBottom: '8px' }}
                  onClick={() => {
                    // Set target loop for function creation
                    setTargetLoop(currentLoopForAdding);
                    setShowAddToLoopModal(false);
                    setCurrentLoopForAdding(null);
                    handleAddFunction();
                  }}
                >
                  Create New Function in Loop
                </button>

                {/* Show existing root-level items that can be moved */}
                {(() => {
                  // Filter out the loop itself to prevent moving a loop into itself
                  const moveableEntries = entries.filter(entry => entry.id !== currentLoopForAdding);

                  return moveableEntries.length > 0 && (
                    <>
                      <hr style={{ margin: '16px 0' }} />
                      <p style={{ fontSize: '0.9em', marginBottom: '8px' }}>Or move existing item:</p>
                      <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                        {moveableEntries.map((entry) => (
                          <button
                            key={entry.id}
                            className="qmeasure-button qmeasure-button-secondary"
                            style={{ width: '100%', marginBottom: '4px', textAlign: 'left' }}
                            onClick={() => {
                              // Move this entry into the loop
                              if (confirm(`Move "${entry.name}" into this loop?`)) {
                                // Remove from root
                                remove(entry.id);
                                // Add to target loop
                                addToLoop(currentLoopForAdding, entry);
                                setShowAddToLoopModal(false);
                                setCurrentLoopForAdding(null);
                              }
                            }}
                          >
                            {entry.queueType === 'sweep' && '📊 '}
                            {entry.queueType === 'function' && '⚙️ '}
                            {entry.queueType === 'loop' && '🔁 '}
                            {entry.name}
                          </button>
                        ))}
                      </div>
                    </>
                  );
                })()}

                <hr style={{ margin: '16px 0' }} />
                <button
                  className="qmeasure-button qmeasure-button-secondary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setShowAddToLoopModal(false);
                    setCurrentLoopForAdding(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
