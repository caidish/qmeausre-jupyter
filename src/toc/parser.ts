/**
 * Tree-sitter-based Python parser for extracting sweep parameter details
 */

import Parser from 'web-tree-sitter';

// Import the WASM files - both runtime and grammar
const TREE_SITTER_WASM_URL = new URL('./grammars/tree-sitter.wasm', import.meta.url).href;
const PYTHON_WASM_URL = new URL('./grammars/tree-sitter-python.wasm', import.meta.url).href;

/**
 * Structured sweep metadata for rich rendering
 */
export interface SweepMetrics {
  // Core parameters
  setParam?: string;
  start?: string;
  stop?: string;
  step?: string;

  // Sweep0D specific
  maxTime?: string;
  interDelay?: string;
  plotBin?: string;

  // Sweep2D specific
  innerSweep?: string;
  outerSweep?: string;

  // Additional parameters
  followParams?: string[];
  xAxisTime?: string;
}

export interface SweepFlags {
  bidirectional?: boolean;
  continual?: boolean;
  plotData?: boolean;
  saveData?: boolean;
}

export interface ParsedSweep {
  type: 'sweep0d' | 'sweep1d' | 'sweep2d' | 'simulsweep' | 'sweepqueue';
  name: string;
  metrics: SweepMetrics;
  flags: SweepFlags;
  notes?: string;
  complete: boolean; // Whether all required params were resolved
  diagnostics?: string[];
}

/**
 * Custom error for parser initialization failures
 */
export class ParserInitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParserInitError';
  }
}

/**
 * Custom error for parse failures
 */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Singleton parser manager
 */
class ParserManager {
  private static instance: ParserManager;
  private parser: Parser | null = null;
  private initPromise: Promise<Parser> | null = null;
  private hasError = false;

  private constructor() {}

  static getInstance(): ParserManager {
    if (!ParserManager.instance) {
      ParserManager.instance = new ParserManager();
    }
    return ParserManager.instance;
  }

  async getParser(): Promise<Parser> {
    // Return cached parser if available
    if (this.parser) {
      return this.parser;
    }

    // Return in-flight initialization if happening
    if (this.initPromise) {
      return this.initPromise;
    }

    // Don't retry if we already failed
    if (this.hasError) {
      throw new ParserInitError('Parser initialization previously failed');
    }

    // Start initialization
    this.initPromise = this.initializeParser();

    try {
      this.parser = await this.initPromise;
      return this.parser;
    } catch (err) {
      this.hasError = true;
      this.initPromise = null;
      throw err;
    }
  }

  private async initializeParser(): Promise<Parser> {
    try {
      // Initialize tree-sitter with locateFile hook to find the runtime WASM
      await Parser.init({
        locateFile: (scriptName: string) =>
          scriptName === 'tree-sitter.wasm' ? TREE_SITTER_WASM_URL : scriptName
      });
      const parser = new Parser();
      const lang = await Parser.Language.load(PYTHON_WASM_URL);
      parser.setLanguage(lang);
      return parser;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[Sweep ToC] Failed to initialize tree-sitter parser:', message);
      throw new ParserInitError(`Failed to load Python grammar: ${message}`);
    }
  }
}

/**
 * Cache for parsed results (keyed by source hash)
 */
const parseCache = new Map<string, ParsedSweep[]>();

/**
 * Parse sweeps from a code cell source
 */
export async function parseSweeps(source: string): Promise<ParsedSweep[]> {
  // Check cache first
  const hash = hashString(source);
  if (parseCache.has(hash)) {
    return parseCache.get(hash)!;
  }

  try {
    const manager = ParserManager.getInstance();
    const parser = await manager.getParser();

    // Parse the source
    const tree = parser.parse(source);

    // Extract constants from the cell
    const constants = extractConstants(tree.rootNode, source);

    // Find all sweep assignments
    const sweeps = extractSweepCalls(tree.rootNode, source, constants);

    // Cache and return
    parseCache.set(hash, sweeps);
    return sweeps;
  } catch (err) {
    if (err instanceof ParserInitError) {
      // Parser not available - return empty array
      return [];
    }
    throw err;
  }
}

/**
 * Extract simple constant assignments from AST
 */
function extractConstants(
  node: Parser.SyntaxNode,
  source: string
): Map<string, string> {
  const constants = new Map<string, string>();

  // Walk all assignment nodes
  const cursor = node.walk();
  let reachedRoot = false;

  while (!reachedRoot) {
    if (cursor.nodeType === 'assignment') {
      const assignNode = cursor.currentNode();
      const left = assignNode.childForFieldName('left');
      const right = assignNode.childForFieldName('right');

      if (left && right && left.type === 'identifier') {
        const varName = source.substring(left.startIndex, left.endIndex);

        // Only capture literals
        if (
          right.type === 'integer' ||
          right.type === 'float' ||
          right.type === 'string' ||
          right.type === 'true' ||
          right.type === 'false' ||
          right.type === 'none'
        ) {
          const value = source.substring(right.startIndex, right.endIndex);
          constants.set(varName, value);
        }
      }
    }

    if (cursor.gotoFirstChild()) {
      continue;
    }

    while (!cursor.gotoNextSibling()) {
      if (!cursor.gotoParent()) {
        reachedRoot = true;
        break;
      }
    }
  }

  return constants;
}

/**
 * Extract sweep call expressions from AST
 */
function extractSweepCalls(
  node: Parser.SyntaxNode,
  source: string,
  constants: Map<string, string>
): ParsedSweep[] {
  const sweeps: ParsedSweep[] = [];
  const sweepTypes = ['Sweep0D', 'Sweep1D', 'Sweep2D', 'SimulSweep', 'SweepQueue'];

  const cursor = node.walk();
  let reachedRoot = false;

  while (!reachedRoot) {
    if (cursor.nodeType === 'assignment') {
      const assignNode = cursor.currentNode();
      const left = assignNode.childForFieldName('left');
      const right = assignNode.childForFieldName('right');

      if (left && right && left.type === 'identifier' && right.type === 'call') {
        const varName = source.substring(left.startIndex, left.endIndex);
        const funcNode = right.childForFieldName('function');

        if (funcNode && sweepTypes.includes(funcNode.text)) {
          const sweepType = funcNode.text;
          const argsNode = right.childForFieldName('arguments');

          if (argsNode) {
            const params = extractCallArguments(
              argsNode,
              source,
              constants,
              sweepType as any
            );
            const { metrics, flags, complete } = structureSweepData(
              sweepType as any,
              params
            );

            sweeps.push({
              type: sweepType.toLowerCase() as any,
              name: varName,
              metrics,
              flags,
              complete,
              diagnostics: []
            });
          }
        }
      }
    }

    if (cursor.gotoFirstChild()) {
      continue;
    }

    while (!cursor.gotoNextSibling()) {
      if (!cursor.gotoParent()) {
        reachedRoot = true;
        break;
      }
    }
  }

  return sweeps;
}

/**
 * Extract arguments from a call's argument list
 */
function extractCallArguments(
  argsNode: Parser.SyntaxNode,
  source: string,
  constants: Map<string, string>,
  sweepType: 'Sweep0D' | 'Sweep1D' | 'Sweep2D' | 'SimulSweep' | 'SweepQueue'
): Record<string, string> {
  const params: Record<string, string> = {};
  const positionalArgs: string[] = [];

  // First pass: collect all arguments
  for (let i = 0; i < argsNode.namedChildCount; i++) {
    const child = argsNode.namedChild(i);
    if (!child) continue;

    if (child.type === 'keyword_argument') {
      const nameNode = child.childForFieldName('name');
      const valueNode = child.childForFieldName('value');

      if (nameNode && valueNode) {
        const key = source.substring(nameNode.startIndex, nameNode.endIndex);
        let value = resolveValue(valueNode, source, constants);
        params[key] = value;
      }
    } else {
      // Positional argument
      const value = resolveValue(child, source, constants);
      positionalArgs.push(value);
    }
  }

  // Map positional arguments based on sweep type
  if (positionalArgs.length > 0) {
    switch (sweepType) {
      case 'Sweep1D':
        // Sweep1D(set_param, start, stop, step, ...)
        if (positionalArgs[0] && !params.set_param) params.set_param = positionalArgs[0];
        if (positionalArgs[1] && !params.start) params.start = positionalArgs[1];
        if (positionalArgs[2] && !params.stop) params.stop = positionalArgs[2];
        if (positionalArgs[3] && !params.step) params.step = positionalArgs[3];
        break;

      case 'Sweep2D':
        // Sweep2D(inner_sweep, outer_sweep, ...)
        if (positionalArgs[0] && !params.inner_sweep) params.inner_sweep = positionalArgs[0];
        if (positionalArgs[1] && !params.outer_sweep) params.outer_sweep = positionalArgs[1];
        break;

      case 'Sweep0D':
        // Sweep0D doesn't typically use positional args for core params
        break;

      default:
        // For other types, just store first positional as set_param if needed
        if (positionalArgs[0] && !params.set_param) {
          params.set_param = positionalArgs[0];
        }
    }
  }

  return params;
}

/**
 * Resolve a value node to a string, substituting constants
 */
function resolveValue(
  node: Parser.SyntaxNode,
  source: string,
  constants: Map<string, string>
): string {
  // If it's an identifier, check if we have a constant for it
  if (node.type === 'identifier') {
    const name = source.substring(node.startIndex, node.endIndex);
    if (constants.has(name)) {
      return constants.get(name)!;
    }
    return name;
  }

  // If it's an attribute (e.g., station.dmm.voltage), simplify it
  if (node.type === 'attribute') {
    const text = source.substring(node.startIndex, node.endIndex);
    if (text.startsWith('station.')) {
      return text.substring(8); // Remove 'station.' prefix
    }
    return text;
  }

  // For literals, return as-is
  return source.substring(node.startIndex, node.endIndex);
}

/**
 * Structure sweep data into metrics and flags
 */
function structureSweepData(
  type: 'Sweep0D' | 'Sweep1D' | 'Sweep2D' | 'SimulSweep' | 'SweepQueue',
  params: Record<string, string>
): { metrics: SweepMetrics; flags: SweepFlags; complete: boolean } {
  const metrics: SweepMetrics = {};
  const flags: SweepFlags = {};
  let complete = false;

  // Extract common flags
  if (params.bidirectional === 'True') flags.bidirectional = true;
  if (params.continual === 'True') flags.continual = true;
  if (params.plot_data === 'True') flags.plotData = true;
  if (params.save_data === 'True') flags.saveData = true;

  switch (type) {
    case 'Sweep0D':
      metrics.maxTime = params.max_time;
      metrics.interDelay = params.inter_delay;
      metrics.plotBin = params.plot_bin;
      metrics.xAxisTime = params.x_axis_time;
      complete = true; // Sweep0D has no strictly required params
      break;

    case 'Sweep1D':
      metrics.setParam = params.set_param;
      metrics.start = params.start;
      metrics.stop = params.stop;
      metrics.step = params.step;
      metrics.xAxisTime = params.x_axis_time;
      metrics.interDelay = params.inter_delay;
      complete = !!(metrics.setParam && metrics.start && metrics.stop && metrics.step);
      break;

    case 'Sweep2D':
      metrics.innerSweep = params.inner_sweep;
      metrics.outerSweep = params.outer_sweep;
      complete = !!(metrics.innerSweep || metrics.outerSweep);
      break;

    case 'SimulSweep':
    case 'SweepQueue':
      complete = true;
      break;
  }

  return { metrics, flags, complete };
}

/**
 * Simple string hash for caching
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
