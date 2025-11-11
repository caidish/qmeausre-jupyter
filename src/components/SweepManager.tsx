/**
 * Main Sweep Manager component - sidebar widget
 */

import React, { useState } from "react";
import { ReactWidget } from "@jupyterlab/ui-components";
import { INotebookTracker } from "@jupyterlab/notebook";
import {
  SweepType,
  Sweep0DParameters,
  Sweep1DParameters,
  Sweep2DParameters,
  SimulSweepParameters,
  SweeptoParameters,
  GateLeakageParameters,
} from "../types";
import { QueueEntry, DatabaseConfig } from "../types/queue";
import { Sweep0DForm } from "./Sweep0DForm";
import { Sweep1DForm } from "./Sweep1DForm";
import { Sweep2DForm } from "./Sweep2DForm";
import { SimulSweepForm } from "./SimulSweepForm";
import { FastSweepsForm } from "./FastSweepsForm";
import { DatabaseForm } from "./DatabaseForm";
import {
  generateSweep0D,
  generateSweep1D,
  generateSweep2D,
  generateSimulSweep,
  generateSweepto,
  generateGateLeakage,
  renderSweepCode,
} from "../services/CodeGenerator";
import { getQueueStore, useQueueStore } from "../queue/queueStore";

type TabType = SweepType | "database" | "fastsweeps";

/**
 * Props for the SweepManagerComponent
 */
interface SweepManagerComponentProps {
  notebookTracker: INotebookTracker;
}

/**
 * Main React component for the Sweep Manager
 */
const SweepManagerComponent: React.FC<SweepManagerComponentProps> = ({
  notebookTracker,
}) => {
  const [selectedTab, setSelectedTab] = useState<TabType>("sweep1d");
  const [lastSweepName, setLastSweepName] = useState<string>("s_1D");
  const [pendingStartCode, setPendingStartCode] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<QueueEntry | null>(null);
  const [lastQueuedEntryId, setLastQueuedEntryId] = useState<string | null>(
    null,
  );

  // Subscribe to queue store for editing
  const queueStoreHook = useQueueStore();
  const { selectedId, entries } = queueStoreHook.state;

  // Watch for queue entry selection (for editing)
  React.useEffect(() => {
    if (selectedId) {
      const entry = entries.find((e: QueueEntry) => e.id === selectedId);
      if (entry) {
        setEditingEntry(entry);
        // Switch to the appropriate tab
        // Map fast-sweep types to fastsweeps tab
        if (entry.sweepType === "sweepto" || entry.sweepType === "gateleakage") {
          setSelectedTab("fastsweeps");
        } else {
          setSelectedTab(entry.sweepType as TabType);
        }
      }
    } else {
      setEditingEntry(null);
    }
  }, [selectedId, entries]);

  const insertCode = (code: string) => {
    const notebook = notebookTracker.currentWidget?.content;
    if (!notebook) {
      alert("No active notebook found");
      return;
    }

    const model = notebook.model;
    if (!model) {
      alert("No notebook model available");
      return;
    }

    const sharedModel = model.sharedModel;
    const activeIndex = Math.max(0, notebook.activeCellIndex);
    const insertIndex = Math.min(sharedModel.cells.length, activeIndex + 1);

    sharedModel.transact(() => {
      sharedModel.insertCell(insertIndex, {
        cell_type: "code",
        source: code,
      });
    });

    notebook.activeCellIndex = insertIndex;
    const newCell = notebook.widgets[insertIndex];
    if (newCell) {
      void notebook.scrollToCell(newCell, "center");
    }
    notebook.mode = "edit";
  };

  const handleGenerate = (params: any) => {
    let sweepCode;
    let sweepName = "s_1D";

    if (selectedTab === "fastsweeps") {
      // Determine sweep type by checking params structure
      if ("parameter_path" in params) {
        sweepCode = generateSweepto(params as SweeptoParameters);
        sweepName = (params as SweeptoParameters).sweep_name || "s_to";
      } else if ("track_param" in params) {
        sweepCode = generateGateLeakage(params as GateLeakageParameters);
        sweepName = (params as GateLeakageParameters).sweep_name || "s_gate";
      } else {
        alert("Unknown fast sweep type");
        return;
      }
    } else {
      switch (selectedTab as SweepType) {
        case "sweep0d":
          sweepCode = generateSweep0D(params as Sweep0DParameters);
          sweepName = (params as Sweep0DParameters).sweep_name || "s_0D";
          break;
        case "sweep1d":
          sweepCode = generateSweep1D(params as Sweep1DParameters);
          sweepName = (params as Sweep1DParameters).sweep_name || "s_1D";
          break;
        case "sweep2d":
          sweepCode = generateSweep2D(params as Sweep2DParameters);
          sweepName = (params as Sweep2DParameters).sweep_name || "s_2D";
          break;
        case "simulsweep":
          sweepCode = generateSimulSweep(params as SimulSweepParameters);
          sweepName = (params as SimulSweepParameters).sweep_name || "s_simul";
          break;
        default:
          alert("This sweep type is not yet implemented");
          return;
      }
    }

    // If save_data is true, defer start code until after database setup
    const includeStart = !params.save_data;
    const code = renderSweepCode(sweepCode, includeStart);

    setLastSweepName(sweepName);
    insertCode(code);

    // Store start code for database form if save_data is enabled
    if (params.save_data) {
      setPendingStartCode(sweepCode.start);
      setSelectedTab("database");
    } else {
      setPendingStartCode(null);
    }
  };

  const handleDatabaseGenerate = (code: string) => {
    insertCode(code);
  };

  const handleDatabaseAddToQueue = (
    dbConfig: DatabaseConfig,
    startCode: string | null,
  ) => {
    if (!lastQueuedEntryId) {
      console.warn("No queue entry to update with database config");
      return;
    }

    const queueStore = getQueueStore();
    const entry = queueStore.getEntry(lastQueuedEntryId);

    if (!entry) {
      console.error(`Queue entry ${lastQueuedEntryId} not found`);
      return;
    }

    // Update entry with database config and deferred start code
    const updatedEntry: QueueEntry = {
      ...entry,
      database: dbConfig,
      code: {
        ...entry.code,
        start: startCode || entry.code.start,
      },
      modifiedAt: Date.now(),
    };

    queueStore.addOrReplace(updatedEntry);

    console.log(`Updated queue entry "${entry.name}" with database config`);

    // Clear the pending state
    setLastQueuedEntryId(null);
    setPendingStartCode(null);
  };

  const handleAddToQueue = (params: any) => {
    let sweepCode;
    let sweepName = "Sweep";
    let sweepType: QueueEntry["sweepType"] = "sweep1d";

    if (selectedTab === "fastsweeps") {
      // Determine sweep type by checking params structure
      if ("parameter_path" in params) {
        sweepCode = generateSweepto(params as SweeptoParameters);
        sweepName = (params as SweeptoParameters).sweep_name || "Sweepto";
        sweepType = "sweepto";
      } else if ("track_param" in params) {
        sweepCode = generateGateLeakage(params as GateLeakageParameters);
        sweepName = (params as GateLeakageParameters).sweep_name || "GateLeakage";
        sweepType = "gateleakage";
      } else {
        alert("Unknown fast sweep type");
        return;
      }
    } else {
      switch (selectedTab as SweepType) {
        case "sweep0d":
          sweepCode = generateSweep0D(params as Sweep0DParameters);
          sweepName = (params as Sweep0DParameters).sweep_name || "Sweep0D";
          sweepType = "sweep0d";
          break;
        case "sweep1d":
          sweepCode = generateSweep1D(params as Sweep1DParameters);
          sweepName = (params as Sweep1DParameters).sweep_name || "Sweep1D";
          sweepType = "sweep1d";
          break;
        case "sweep2d":
          sweepCode = generateSweep2D(params as Sweep2DParameters);
          sweepName = (params as Sweep2DParameters).sweep_name || "Sweep2D";
          sweepType = "sweep2d";
          break;
        case "simulsweep":
          sweepCode = generateSimulSweep(params as SimulSweepParameters);
          sweepName = (params as SimulSweepParameters).sweep_name || "SimulSweep";
          sweepType = "simulsweep";
          break;
        default:
          alert("This sweep type is not yet implemented");
          return;
      }
    }

    // If editing an existing entry, update it; otherwise create new
    const queueEntry: QueueEntry = editingEntry
      ? {
          ...editingEntry,
          name: sweepName,
          sweepType: sweepType,
          code: sweepCode,
          params: params,
          modifiedAt: Date.now(),
        }
      : {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: sweepName,
          sweepType: sweepType,
          code: sweepCode,
          params: params,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };

    // Add/update in queue store
    const queueStore = getQueueStore();
    queueStore.addOrReplace(queueEntry);

    // Clear editing state and deselect
    setEditingEntry(null);
    queueStore.select(undefined);

    console.log(
      `${editingEntry ? "Updated" : "Added"} "${sweepName}" ${editingEntry ? "in" : "to"} queue`,
    );

    // If save_data is enabled, switch to database tab for configuration
    if (params.save_data && sweepCode.start) {
      setLastQueuedEntryId(queueEntry.id); // Store for DB config update
      setPendingStartCode(sweepCode.start);
      setSelectedTab("database");
    } else {
      // Clear any pending database config
      setLastQueuedEntryId(null);
      setPendingStartCode(null);
    }
  };

  const renderForm = () => {
    // Extract initialState from editing entry if present
    // For fast sweeps, check if editingEntry is sweepto or gateleakage
    const isEditingFastSweep =
      editingEntry &&
      (editingEntry.sweepType === "sweepto" ||
        editingEntry.sweepType === "gateleakage");
    const initialState =
      editingEntry &&
      (editingEntry.sweepType === selectedTab ||
        (selectedTab === "fastsweeps" && isEditingFastSweep))
        ? editingEntry.params
        : undefined;

    switch (selectedTab) {
      case "sweep0d":
        return (
          <Sweep0DForm
            onGenerate={handleGenerate}
            onAddToQueue={handleAddToQueue}
            initialState={initialState}
          />
        );
      case "sweep1d":
        return (
          <Sweep1DForm
            onGenerate={handleGenerate}
            onAddToQueue={handleAddToQueue}
            initialState={initialState}
          />
        );
      case "sweep2d":
        return (
          <Sweep2DForm
            onGenerate={handleGenerate}
            onAddToQueue={handleAddToQueue}
            initialState={initialState}
          />
        );
      case "simulsweep":
        return (
          <SimulSweepForm
            onGenerate={handleGenerate}
            onAddToQueue={handleAddToQueue}
            initialState={initialState}
          />
        );
      case "fastsweeps":
        return (
          <FastSweepsForm
            onGenerate={handleGenerate}
            onAddToQueue={handleAddToQueue}
            initialState={initialState}
          />
        );
      case "database":
        return (
          <DatabaseForm
            sweepName={lastSweepName}
            startCode={pendingStartCode}
            onGenerate={handleDatabaseGenerate}
            onAddToQueue={handleDatabaseAddToQueue}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="qmeasure-sweep-manager">
      <div className="qmeasure-header">
        <h2>Sweep Manager</h2>
        <p className="qmeasure-subtitle">MeasureIt Code Generator</p>
      </div>

      {editingEntry && (
        <div className="qmeasure-editing-banner">
          Editing: <strong>{editingEntry.name}</strong>
          <button
            className="qmeasure-editing-cancel"
            onClick={() => {
              setEditingEntry(null);
              const queueStore = getQueueStore();
              queueStore.select(undefined);
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="qmeasure-tabs">
        <button
          className={`qmeasure-tab ${selectedTab === "sweep0d" ? "active" : ""}`}
          onClick={() => setSelectedTab("sweep0d")}
        >
          Sweep0D
        </button>
        <button
          className={`qmeasure-tab ${selectedTab === "sweep1d" ? "active" : ""}`}
          onClick={() => setSelectedTab("sweep1d")}
        >
          Sweep1D
        </button>
        <button
          className={`qmeasure-tab ${selectedTab === "sweep2d" ? "active" : ""}`}
          onClick={() => setSelectedTab("sweep2d")}
        >
          Sweep2D
        </button>
        <button
          className={`qmeasure-tab ${selectedTab === "simulsweep" ? "active" : ""}`}
          onClick={() => setSelectedTab("simulsweep")}
        >
          SimulSweep
        </button>
        <button
          className={`qmeasure-tab ${selectedTab === "fastsweeps" ? "active" : ""}`}
          onClick={() => setSelectedTab("fastsweeps")}
        >
          Fast Sweeps
        </button>
        <button
          className={`qmeasure-tab ${selectedTab === "database" ? "active" : ""}`}
          onClick={() => setSelectedTab("database")}
        >
          Database
        </button>
      </div>

      <div className="qmeasure-content">{renderForm()}</div>
    </div>
  );
};

/**
 * Lumino Widget wrapper for the React component
 */
export class SweepManagerWidget extends ReactWidget {
  private notebookTracker: INotebookTracker;

  constructor(notebookTracker: INotebookTracker) {
    super();
    this.notebookTracker = notebookTracker;
    this.addClass("qmeasure-widget");
    this.title.label = "Sweep Manager";
  }

  render(): JSX.Element {
    return <SweepManagerComponent notebookTracker={this.notebookTracker} />;
  }
}
