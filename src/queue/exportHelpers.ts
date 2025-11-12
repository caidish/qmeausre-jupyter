/**
 * Helper utilities for code export
 */

/**
 * Indent a block of code
 * @param code - Code string
 * @param level - Indentation level (0 = no indent)
 * @returns Indented code
 */
export function indentCode(code: string, level: number): string {
  if (level === 0) return code;

  const indent = "    ".repeat(level); // 4 spaces per level
  return code
    .split("\n")
    .map((line) => (line.trim() ? indent + line : line))
    .join("\n");
}

/**
 * Generate unique function name for queue functions
 * @param id - Entry ID
 * @returns Valid Python function name
 */
export function generateFunctionName(id: string): string {
  // Convert ID to valid Python identifier
  const sanitized = id.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
  return `_func_${sanitized}`;
}

/**
 * Generate unique loop variable name
 * @param id - Loop ID
 * @param kind - Loop kind
 * @returns Valid Python variable name
 */
export function generateLoopVarName(id: string, kind: 'repeat' | 'values'): string {
  const sanitized = id.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
  return kind === 'repeat' ? `i_${sanitized}` : `value_${sanitized}`;
}

/**
 * Escape Python string
 */
export function escapePythonString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/**
 * Validate Python code syntax (basic check)
 * Returns null if valid, error message if invalid
 */
export function validatePythonSyntax(code: string): string | null {
  // Basic checks
  const lines = code.split("\n");

  // Check for unclosed strings
  let inString = false;
  let stringChar = "";
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : "";

      if ((char === '"' || char === "'") && prevChar !== "\\") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = "";
        }
      }
    }
  }

  if (inString) {
    return "Unclosed string literal";
  }

  // Check for basic indentation issues (very basic)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const leadingSpaces = line.match(/^( *)/)?.[1].length || 0;

    if (leadingSpaces % 4 !== 0) {
      return `Indentation error on line ${i + 1} (should be multiple of 4 spaces)`;
    }
  }

  return null;
}
