/**
 * Export queue entries to MeasureIt Python code (with loop and function support)
 */

import {
  QueueItem,
  QueueSweepEntry,
  QueueFunctionEntry,
  QueueLoopEntry,
  DatabaseConfig,
  isSweepEntry,
  isFunctionEntry,
  isLoopEntry,
} from "../types/queue";
import {
  indentCode,
  generateFunctionName,
  generateLoopVarName,
  escapePythonString,
} from "./exportHelpers";

/**
 * Generate DatabaseEntry Python code
 * @param db - Database configuration
 * @returns Python code string for DatabaseEntry
 *
 * MeasureIt's DatabaseEntry signature: DatabaseEntry(db_path, exp_name, sample_name)
 */
function generateDatabaseEntry(db: DatabaseConfig): string {
  // Use MeasureIt's get_path to construct database path
  const dbPath = `str(get_path("databases") / "${db.database}")`;

  return `DatabaseEntry(${dbPath}, "${db.experiment}", "${db.sample}")`;
}

/**
 * Generate Python variable name from sweep name
 * @param name - Human-readable name
 * @param index - Queue index for uniqueness
 * @returns Valid Python variable name
 */
function generateVarName(name: string, index: number): string {
  // Convert to valid Python identifier
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^[0-9]/, "_$&");

  return `sweep_${index}_${sanitized}`;
}

/**
 * Export context for tracking state during recursive export
 */
interface ExportContext {
  indentLevel: number;
  sweepVarNames: Map<string, string>; // id -> variable name
  functionNames: Map<string, string>; // id -> function name
  sweepCounter: { value: number }; // Wrap in object for pass-by-reference
}

/**
 * Export a single queue item (recursive for loops)
 * @param item - Queue item to export
 * @param ctx - Export context
 * @returns Array of code sections
 */
function exportItem(item: QueueItem, ctx: ExportContext): string[] {
  if (isSweepEntry(item)) {
    return exportSweepEntry(item, ctx);
  } else if (isFunctionEntry(item)) {
    return exportFunctionEntry(item, ctx);
  } else if (isLoopEntry(item)) {
    return exportLoopEntry(item, ctx);
  }
  return [];
}

/**
 * Export a sweep entry
 */
function exportSweepEntry(entry: QueueSweepEntry, ctx: ExportContext): string[] {
  const sections: string[] = [];
  const varName = generateVarName(entry.name, ctx.sweepCounter.value++);
  ctx.sweepVarNames.set(entry.id, varName);

  // Setup code
  sections.push(`# ${entry.name} (${entry.sweepType})`);
  let setupCode = entry.code.setup;

  // Replace sweep variable name
  const sweepVarMatch = setupCode.match(/^(\w+)\s*=\s*Sweep/m);
  if (sweepVarMatch && sweepVarMatch[1]) {
    const originalVar = sweepVarMatch[1];
    setupCode = setupCode.replace(
      new RegExp(`\\b${originalVar}\\b`, "g"),
      varName,
    );
  }

  sections.push(indentCode(setupCode, ctx.indentLevel));
  sections.push("");

  // Queue append
  if (entry.database) {
    const dbEntry = generateDatabaseEntry(entry.database);
    sections.push(
      indentCode(`sq.append((${dbEntry}, ${varName}))`, ctx.indentLevel),
    );
  } else {
    sections.push(indentCode(`sq.append(${varName})`, ctx.indentLevel));
  }
  sections.push("");

  return sections;
}

/**
 * Export a function entry
 */
function exportFunctionEntry(entry: QueueFunctionEntry, ctx: ExportContext): string[] {
  const sections: string[] = [];
  const funcName = generateFunctionName(entry.id);
  ctx.functionNames.set(entry.id, funcName);

  // Only append to queue - function definition is handled by collectFunctionDefinitions
  sections.push(`# ${entry.name}`);
  sections.push(indentCode(`sq.append(${funcName})`, ctx.indentLevel));
  sections.push("");

  return sections;
}

/**
 * Export a loop entry (recursive)
 */
function exportLoopEntry(entry: QueueLoopEntry, ctx: ExportContext): string[] {
  const sections: string[] = [];

  // Loop header
  sections.push(`# Loop: ${entry.name}`);

  if (entry.loopKind === 'repeat') {
    const loopVar = generateLoopVarName(entry.id, 'repeat');
    const count = entry.count || 1;
    sections.push(indentCode(`for ${loopVar} in range(${count}):`, ctx.indentLevel));
  } else {
    // values loop
    const loopVar = entry.loopVarName || generateLoopVarName(entry.id, 'values');
    const values = entry.values || [];
    const valuesList = values.join(", ");
    sections.push(indentCode(`for ${loopVar} in [${valuesList}]:`, ctx.indentLevel));
  }

  // Export loop body with increased indent
  const bodyCtx: ExportContext = {
    ...ctx,
    indentLevel: ctx.indentLevel + 1,
  };

  entry.body.forEach((bodyItem) => {
    const bodySections = exportItem(bodyItem, bodyCtx);
    sections.push(...bodySections);
  });

  sections.push("");
  return sections;
}

/**
 * Collect all function definitions from queue
 * Functions need to be defined before queue construction
 */
function collectFunctionDefinitions(entries: QueueItem[]): string[] {
  const sections: string[] = [];
  const ctx: ExportContext = {
    indentLevel: 0,
    sweepVarNames: new Map(),
    functionNames: new Map(),
    sweepCounter: { value: 0 },
  };

  const traverse = (items: QueueItem[]) => {
    items.forEach((item) => {
      if (isFunctionEntry(item)) {
        const funcName = generateFunctionName(item.id);
        ctx.functionNames.set(item.id, funcName);

        sections.push(`# ${item.name}`);
        sections.push(`def ${funcName}():`);

        const userCode = item.pythonCode.trim();
        if (userCode) {
          sections.push(indentCode(userCode, 1));
        } else {
          sections.push("    pass");
        }
        sections.push("");
      } else if (isLoopEntry(item)) {
        traverse(item.body);
      }
    });
  };

  traverse(entries);
  return sections;
}

/**
 * Collect required imports from queue
 */
function collectImports(entries: QueueItem[]): {
  sweepTypes: Set<string>;
  needsDatabase: boolean;
  hasFunctions: boolean;
} {
  const sweepTypes = new Set<string>();
  let needsDatabase = false;
  let hasFunctions = false;

  const traverse = (items: QueueItem[]) => {
    items.forEach((item) => {
      if (isSweepEntry(item)) {
        switch (item.sweepType) {
          case "sweep0d":
            sweepTypes.add("Sweep0D");
            break;
          case "sweep1d":
            sweepTypes.add("Sweep1D");
            break;
          case "sweep2d":
            sweepTypes.add("Sweep2D");
            break;
          case "simulsweep":
            sweepTypes.add("SimulSweep");
            break;
          case "gateleakage":
            sweepTypes.add("GateLeakage");
            break;
        }
        if (item.database) {
          needsDatabase = true;
        }
      } else if (isFunctionEntry(item)) {
        hasFunctions = true;
      } else if (isLoopEntry(item)) {
        traverse(item.body);
      }
    });
  };

  traverse(entries);
  return { sweepTypes, needsDatabase, hasFunctions };
}

/**
 * Export queue entries to executable Python code
 * @param entries - Queue entries to export
 * @returns Complete Python script
 */
export function exportSweepQueue(entries: QueueItem[]): string {
  if (entries.length === 0) {
    return "# Empty queue - no sweeps to run\n";
  }

  const sections: string[] = [];

  // Collect imports
  const { sweepTypes, needsDatabase, hasFunctions } = collectImports(entries);
  const sweepImports = Array.from(sweepTypes).sort().join(", ");

  // Build import lines conditionally
  const imports: string[] = [];
  imports.push("from measureit.tools.sweep_queue import SweepQueue" + (needsDatabase ? ", DatabaseEntry" : ""));

  // Only add sweep class imports if we have sweeps
  if (sweepImports) {
    imports.push("from measureit import " + sweepImports + (needsDatabase && !sweepImports.includes("get_path") ? ", get_path" : needsDatabase ? "" : ""));
  } else if (needsDatabase) {
    // Only database is needed, no sweep classes
    imports.push("from measureit import get_path");
  }

  imports.push("from measureit.tools import ensure_qt");
  imports.push("import qcodes as qc");

  // Header
  sections.push(`# Generated Sweep Queue
# Generated by QMeasure Jupyter Extension
# Total entries: ${entries.length}

${imports.join("\n")}

# Initialize station
station = qc.Station.default

# Ensure Qt event loop is running
ensure_qt()

`);

  // Function definitions (if any)
  const functionDefs = collectFunctionDefinitions(entries);
  if (functionDefs.length > 0) {
    sections.push("# ===== Function Definitions =====\n");
    sections.push(...functionDefs);
  }

  // Sweep setup and queue construction
  sections.push("# ===== Build Queue =====\n");
  sections.push("sq = SweepQueue()\n");

  // Export all entries
  const ctx: ExportContext = {
    indentLevel: 0,
    sweepVarNames: new Map(),
    functionNames: new Map(),
    sweepCounter: { value: 0 },
  };

  entries.forEach((entry) => {
    const entrySections = exportItem(entry, ctx);
    sections.push(...entrySections);
  });

  // Start the queue
  sections.push("# ===== Run Queue =====\n");
  sections.push('print(f"Starting queue with {len(sq)} entries...")');
  sections.push("sq.start()");
  sections.push('print("Queue completed!")');

  return sections.join("\n");
}

/**
 * Export a single entry with optional database configuration
 * @param entry - Queue item
 * @param includeStart - Whether to include the start code (default: true)
 * @returns Python code string
 */
export function exportSingleEntry(
  entry: QueueItem,
  includeStart: boolean = true,
): string {
  const sections: string[] = [];

  if (isSweepEntry(entry)) {
    sections.push(`# ${entry.name} (${entry.sweepType})`);
    sections.push("");
    sections.push(entry.code.setup);
    sections.push("");

    if (entry.database && includeStart) {
      sections.push("# Database configuration");
      const dbEntry = generateDatabaseEntry(entry.database);
      sections.push(`db_entry = ${dbEntry}`);
      sections.push("");
    }

    if (includeStart) {
      sections.push(entry.code.start);
    }
  } else if (isFunctionEntry(entry)) {
    const funcName = generateFunctionName(entry.id);
    sections.push(`# ${entry.name} (function)`);
    sections.push("");
    sections.push(`def ${funcName}():`);
    sections.push(indentCode(entry.pythonCode.trim() || "pass", 1));

    if (includeStart) {
      sections.push("");
      sections.push(`${funcName}()`);
    }
  } else if (isLoopEntry(entry)) {
    sections.push(`# ${entry.name} (loop - cannot export single loop)`);
    sections.push("# Use 'Export Queue' to export complete loop structure");
  }

  return sections.join("\n");
}
