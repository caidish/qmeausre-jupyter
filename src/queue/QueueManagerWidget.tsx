/**
 * Queue Manager Widget - Lumino wrapper for Queue Manager
 */

import React from "react";
import { ReactWidget } from "@jupyterlab/ui-components";
import { INotebookTracker } from "@jupyterlab/notebook";
import { CommandRegistry } from "@lumino/commands";
import { QueueManager } from "./QueueManager";
import { QueueEntry } from "../types/queue";

/**
 * Props for the QueueManagerComponent
 */
interface QueueManagerComponentProps {
  notebookTracker: INotebookTracker;
  commands: CommandRegistry;
  onEdit?: (entry: QueueEntry) => void;
}

/**
 * React component wrapper
 */
const QueueManagerComponent: React.FC<QueueManagerComponentProps> = ({
  notebookTracker,
  commands,
  onEdit,
}) => {
  const handleInsertQueue = () => {
    // Execute the insert-queue command
    commands.execute("qmeasure:insert-queue").catch((err) => {
      console.error("Failed to insert queue code:", err);
    });
  };

  return (
    <QueueManager onEdit={onEdit} onInsertQueue={handleInsertQueue} />
  );
};

/**
 * Lumino Widget for the Queue Manager
 */
export class QueueManagerWidget extends ReactWidget {
  private notebookTracker: INotebookTracker;
  private commands: CommandRegistry;
  private onEditCallback?: (entry: QueueEntry) => void;

  constructor(
    notebookTracker: INotebookTracker,
    commands: CommandRegistry,
    onEdit?: (entry: QueueEntry) => void,
  ) {
    super();
    this.notebookTracker = notebookTracker;
    this.commands = commands;
    this.onEditCallback = onEdit;
    this.addClass("qmeasure-widget");
    this.title.label = "Queue Manager";
    this.title.caption = "MeasureIt Sweep Queue";
  }

  render(): JSX.Element {
    return (
      <QueueManagerComponent
        notebookTracker={this.notebookTracker}
        commands={this.commands}
        onEdit={this.onEditCallback}
      />
    );
  }
}
