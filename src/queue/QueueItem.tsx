/**
 * Recursive queue item component for nested display
 */

import React from "react";
import {
  QueueItem,
  QueueSweepEntry,
  QueueFunctionEntry,
  QueueLoopEntry,
  isSweepEntry,
  isFunctionEntry,
  isLoopEntry,
} from "../types/queue";

interface QueueItemProps {
  item: QueueItem;
  depth: number;
  index: number;
  parentPath: string[];
  isSelected: boolean;
  onEdit: (item: QueueItem, path: string[]) => void;
  onDelete: (id: string, path: string[]) => void;
  onDuplicate: (item: QueueItem, path: string[]) => void;
  onMoveUp: (index: number, path: string[]) => void;
  onMoveDown: (index: number, path: string[]) => void;
  onAddToLoop?: (loopId: string) => void;
}

export const QueueItemComponent: React.FC<QueueItemProps> = ({
  item,
  depth,
  index,
  parentPath,
  isSelected,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddToLoop,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const itemPath = [...parentPath, item.id];

  const renderIcon = () => {
    if (isSweepEntry(item)) {
      const icons: Record<QueueSweepEntry["sweepType"], string> = {
        sweep0d: "⏱",
        sweep1d: "📊",
        sweep2d: "🗺",
        simulsweep: "⚡",
        sweepto: "🎯",
        gateleakage: "🔒",
      };
      return icons[item.sweepType] || "📊";
    } else if (isFunctionEntry(item)) {
      return "⚙️";
    } else if (isLoopEntry(item)) {
      return isExpanded ? "🔽" : "▶️";
    }
    return "❓";
  };

  const renderLabel = () => {
    if (isSweepEntry(item)) {
      return (
        <>
          <span className="qmeasure-queue-item-name">{item.name}</span>
          {item.database && (
            <span
              className="qmeasure-queue-item-badge"
              style={{
                background: '#4caf50',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '0.7em',
                marginLeft: '6px',
                fontWeight: 'bold'
              }}
              title={`Database: ${item.database.database} / ${item.database.experiment} / ${item.database.sample}`}
            >
              💾 DB
            </span>
          )}
          <span className="qmeasure-queue-item-type">
            {item.sweepType.toUpperCase()}
          </span>
        </>
      );
    } else if (isFunctionEntry(item)) {
      return (
        <>
          <span className="qmeasure-queue-item-name">{item.name}</span>
          <span className="qmeasure-queue-item-type">FUNC</span>
        </>
      );
    } else if (isLoopEntry(item)) {
      return (
        <>
          <span className="qmeasure-queue-item-name">{item.name}</span>
          <span className="qmeasure-queue-item-loop-label">{item.label}</span>
          <span className="qmeasure-queue-item-type">
            LOOP ({item.body.length})
          </span>
        </>
      );
    }
  };

  const indentStyle = {
    marginLeft: `${depth * 24}px`,
  };

  return (
    <div className="qmeasure-queue-item-container">
      <div
        className={`qmeasure-queue-item ${isSelected ? "selected" : ""}`}
        style={indentStyle}
      >
        <div
          className="qmeasure-queue-item-header"
          onClick={() => {
            if (isLoopEntry(item)) {
              setIsExpanded(!isExpanded);
            }
          }}
        >
          <span className="qmeasure-queue-item-icon">{renderIcon()}</span>
          {renderLabel()}
        </div>

        <div className="qmeasure-queue-item-actions">
          <button
            className="qmeasure-icon-button"
            onClick={() => onMoveUp(index, parentPath)}
            disabled={index === 0}
            title="Move up"
          >
            ↑
          </button>
          <button
            className="qmeasure-icon-button"
            onClick={() => onMoveDown(index, parentPath)}
            title="Move down"
          >
            ↓
          </button>
          <button
            className="qmeasure-icon-button"
            onClick={() => onEdit(item, itemPath)}
            title="Edit"
          >
            ✏️
          </button>
          <button
            className="qmeasure-icon-button"
            onClick={() => onDuplicate(item, parentPath)}
            title="Duplicate"
          >
            📋
          </button>
          <button
            className="qmeasure-icon-button qmeasure-delete-button"
            onClick={() => onDelete(item.id, parentPath)}
            title="Delete"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Render loop body */}
      {isLoopEntry(item) && isExpanded && (
        <div className="qmeasure-queue-loop-body">
          {item.body.length === 0 && (
            <div
              className="qmeasure-queue-empty-loop"
              style={{ marginLeft: `${(depth + 1) * 24}px` }}
            >
              Empty loop - add sweeps or functions
            </div>
          )}
          {item.body.map((child, childIndex) => (
            <QueueItemComponent
              key={child.id}
              item={child}
              depth={depth + 1}
              index={childIndex}
              parentPath={itemPath}
              isSelected={false} // TODO: implement nested selection
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onAddToLoop={onAddToLoop}
            />
          ))}
          {onAddToLoop && (
            <button
              className="qmeasure-add-to-loop-button"
              style={{ marginLeft: `${(depth + 1) * 24 + 8}px` }}
              onClick={() => onAddToLoop(item.id)}
            >
              + Add to Loop
            </button>
          )}
        </div>
      )}
    </div>
  );
};
