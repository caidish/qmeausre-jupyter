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
  const [lastQueuedEntryPath, setLastQueuedEntryPath] = useState<string[]>([]);

  // Shared parameters for all sweeps
  const [followParams, setFollowParams] = useState<string>("");
  const [sharedSaveData, setSharedSaveData] = useState<boolean>(true);
  const [sharedPlotData, setSharedPlotData] = useState<boolean>(true);
  const [sharedSuppressOutput, setSharedSuppressOutput] = useState<boolean>(true);
  const [sharedInterDelay, setSharedInterDelay] = useState<number>(0.01);
  const [sharedPlotBin, setSharedPlotBin] = useState<number>(1);

  // Subscribe to queue store for editing
  const queueStoreHook = useQueueStore();
  const { selectedId, entries } = queueStoreHook.state;

  // Watch for queue entry selection (for editing)
  React.useEffect(() => {
    if (selectedId) {
      const entry = entries.find((e) => e.id === selectedId);
      // Only handle sweep entries for editing
      if (entry && entry.queueType === 'sweep') {
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
    // Inject shared parameters into params
    const paramsWithShared = {
      ...params,
      follow_params: followParams ? followParams.split(',').map(p => p.trim()).filter(p => p) : [],
      save_data: sharedSaveData,
      plot_data: sharedPlotData,
      suppress_output: sharedSuppressOutput,
      inter_delay: sharedInterDelay,
      plot_bin: sharedPlotBin
    };

    let sweepCode;
    let sweepName = "s_1D";

    if (selectedTab === "fastsweeps") {
      // Determine sweep type by checking params structure
      if ("parameter_path" in paramsWithShared) {
        sweepCode = generateSweepto(paramsWithShared as SweeptoParameters);
        sweepName = (paramsWithShared as SweeptoParameters).sweep_name || "s_to";
      } else if ("track_param" in paramsWithShared) {
        sweepCode = generateGateLeakage(paramsWithShared as GateLeakageParameters);
        sweepName = (paramsWithShared as GateLeakageParameters).sweep_name || "s_gate";
      } else {
        alert("Unknown fast sweep type");
        return;
      }
    } else {
      switch (selectedTab as SweepType) {
        case "sweep0d":
          sweepCode = generateSweep0D(paramsWithShared as Sweep0DParameters);
          sweepName = (paramsWithShared as Sweep0DParameters).sweep_name || "s_0D";
          break;
        case "sweep1d":
          sweepCode = generateSweep1D(paramsWithShared as Sweep1DParameters);
          sweepName = (paramsWithShared as Sweep1DParameters).sweep_name || "s_1D";
          break;
        case "sweep2d":
          sweepCode = generateSweep2D(paramsWithShared as Sweep2DParameters);
          sweepName = (paramsWithShared as Sweep2DParameters).sweep_name || "s_2D";
          break;
        case "simulsweep":
          sweepCode = generateSimulSweep(paramsWithShared as SimulSweepParameters);
          sweepName = (paramsWithShared as SimulSweepParameters).sweep_name || "s_simul";
          break;
        default:
          alert("This sweep type is not yet implemented");
          return;
      }
    }

    // If save_data is true, defer start code until after database setup
    const includeStart = !sharedSaveData;
    const code = renderSweepCode(sweepCode, includeStart);

    setLastSweepName(sweepName);
    insertCode(code);

    // Store start code for database form if save_data is enabled
    if (sharedSaveData) {
      setPendingStartCode(sweepCode.start);
      setSelectedTab("database");
    } else {
      setPendingStartCode(null);
    }

    // Clear any queue tracking state (handleGenerate is not queue-related)
    setLastQueuedEntryId(null);
    setLastQueuedEntryPath([]);
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

    // Try to retrieve by path first (more reliable for nested entries)
    let entry: QueueEntry | undefined;
    if (lastQueuedEntryPath.length > 0) {
      const fullPath = [...lastQueuedEntryPath, lastQueuedEntryId];
      const item = queueStore.getItemByPath(fullPath);
      if (item && item.queueType === 'sweep') {
        entry = item;
      }
    } else {
      // Fall back to ID-based search (for root-level entries)
      const item = queueStore.getEntry(lastQueuedEntryId);
      if (item && item.queueType === 'sweep') {
        entry = item;
      }
    }

    if (!entry) {
      console.error(`Queue entry ${lastQueuedEntryId} not found`);
      alert(`Error: Could not find sweep entry to update with database config`);
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

    const location = lastQueuedEntryPath.length > 0 ? "in loop" : "in queue";
    console.log(`Updated sweep "${entry.name}" ${location} with database config:`, dbConfig);
    alert(`✅ Database config added to sweep "${entry.name}"`);

    // Clear the pending state
    setLastQueuedEntryId(null);
    setLastQueuedEntryPath([]);
    setPendingStartCode(null);
  };

  const handleAddToQueue = (params: any) => {
    // Inject shared parameters into params
    const paramsWithShared = {
      ...params,
      follow_params: followParams ? followParams.split(',').map(p => p.trim()).filter(p => p) : [],
      save_data: sharedSaveData,
      plot_data: sharedPlotData,
      suppress_output: sharedSuppressOutput,
      inter_delay: sharedInterDelay,
      plot_bin: sharedPlotBin
    };

    let sweepCode;
    let sweepName = "Sweep";
    let sweepType: QueueEntry["sweepType"] = "sweep1d";

    if (selectedTab === "fastsweeps") {
      // Determine sweep type by checking params structure
      if ("parameter_path" in params) {
        sweepCode = generateSweepto(paramsWithShared as SweeptoParameters);
        sweepName = (params as SweeptoParameters).sweep_name || "Sweepto";
        sweepType = "sweepto";
      } else if ("track_param" in params) {
        sweepCode = generateGateLeakage(paramsWithShared as GateLeakageParameters);
        sweepName = (params as GateLeakageParameters).sweep_name || "GateLeakage";
        sweepType = "gateleakage";
      } else {
        alert("Unknown fast sweep type");
        return;
      }
    } else {
      switch (selectedTab as SweepType) {
        case "sweep0d":
          sweepCode = generateSweep0D(paramsWithShared as Sweep0DParameters);
          sweepName = (params as Sweep0DParameters).sweep_name || "Sweep0D";
          sweepType = "sweep0d";
          break;
        case "sweep1d":
          sweepCode = generateSweep1D(paramsWithShared as Sweep1DParameters);
          sweepName = (params as Sweep1DParameters).sweep_name || "Sweep1D";
          sweepType = "sweep1d";
          break;
        case "sweep2d":
          sweepCode = generateSweep2D(paramsWithShared as Sweep2DParameters);
          sweepName = (params as Sweep2DParameters).sweep_name || "Sweep2D";
          sweepType = "sweep2d";
          break;
        case "simulsweep":
          sweepCode = generateSimulSweep(paramsWithShared as SimulSweepParameters);
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
          queueType: 'sweep',
          name: sweepName,
          sweepType: sweepType,
          code: sweepCode,
          params: paramsWithShared,
          modifiedAt: Date.now(),
        }
      : {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          queueType: 'sweep',
          name: sweepName,
          sweepType: sweepType,
          code: sweepCode,
          params: paramsWithShared,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };

    // Add/update in queue store
    const queueStore = getQueueStore();

    // Check if we should add to a target loop
    const targetLoop = queueStore.getTargetLoop();
    let entryPath: string[] = [];

    if (targetLoop && !editingEntry) {
      // Add to loop instead of root
      queueStore.addToLoop(targetLoop, queueEntry);
      // Clear target loop after adding
      queueStore.setTargetLoop(undefined);

      // Get path to the target loop (for database update tracking)
      const targetLoopPath = queueStore.getPathToItem(targetLoop);
      if (targetLoopPath !== undefined) {
        entryPath = [...targetLoopPath, targetLoop];
      }

      console.log(`Added "${sweepName}" to loop`);
    } else {
      queueStore.addOrReplace(queueEntry);

      // Get path for the entry (in case it was edited and is nested)
      if (editingEntry) {
        const path = queueStore.getPathToItem(queueEntry.id);
        if (path !== undefined) {
          entryPath = path;
        }
      }

      console.log(
        `${editingEntry ? "Updated" : "Added"} "${sweepName}" ${editingEntry ? "in" : "to"} queue`,
      );
    }

    // Clear editing state and deselect
    setEditingEntry(null);
    queueStore.select(undefined);

    // If save_data is enabled, switch to database tab for configuration
    if (sharedSaveData && sweepCode.start) {
      setLastQueuedEntryId(queueEntry.id); // Store for DB config update
      setLastQueuedEntryPath(entryPath); // Store path for nested entries
      setPendingStartCode(sweepCode.start);
      setSelectedTab("database");
    } else {
      // Clear any pending database config
      setLastQueuedEntryId(null);
      setLastQueuedEntryPath([]);
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

      {/* Shared Parameters Bar - Always visible at top */}
      {selectedTab !== "database" && (
        <div className="qmeasure-shared-params-bar">
          <div className="qmeasure-shared-params-group">
            <label className="qmeasure-shared-label">
              Follow Parameters
              <span className="qmeasure-help-icon" title="Comma-separated list of parameters to measure at each sweep point">
                (?)
              </span>
            </label>
            <input
              type="text"
              className="qmeasure-shared-input"
              value={followParams}
              onChange={(e) => setFollowParams(e.target.value)}
              placeholder="dmm.voltage, lockin.X"
            />
          </div>

          <div className="qmeasure-shared-params-row">
            <div className="qmeasure-shared-params-toggles">
              <label className="qmeasure-shared-checkbox">
                <input
                  type="checkbox"
                  checked={sharedSaveData}
                  onChange={(e) => setSharedSaveData(e.target.checked)}
                />
                <span>Save to Database</span>
              </label>
              <label className="qmeasure-shared-checkbox">
                <input
                  type="checkbox"
                  checked={sharedPlotData}
                  onChange={(e) => setSharedPlotData(e.target.checked)}
                />
                <span>Live Plotting</span>
              </label>
              <label className="qmeasure-shared-checkbox">
                <input
                  type="checkbox"
                  checked={sharedSuppressOutput}
                  onChange={(e) => setSharedSuppressOutput(e.target.checked)}
                />
                <span>Suppress Output</span>
              </label>
            </div>

            <div className="qmeasure-shared-params-numbers">
              <div className="qmeasure-shared-number-group">
                <label className="qmeasure-shared-number-label">Inter Delay (s)</label>
                <input
                  type="number"
                  className="qmeasure-shared-number-input"
                  value={sharedInterDelay}
                  onChange={(e) => setSharedInterDelay(parseFloat(e.target.value) || 0.01)}
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="qmeasure-shared-number-group">
                <label className="qmeasure-shared-number-label">Plot Bin</label>
                <input
                  type="number"
                  className="qmeasure-shared-number-input"
                  value={sharedPlotBin}
                  onChange={(e) => setSharedPlotBin(parseInt(e.target.value) || 1)}
                  step="1"
                  min="1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="qmeasure-content">
        {renderForm()}
      </div>
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
