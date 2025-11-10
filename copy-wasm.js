const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'toc', 'grammars');
const destDir = path.join(__dirname, 'lib', 'toc', 'grammars');

// Create destination directory
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy both WASM files
const wasmFiles = ['tree-sitter.wasm', 'tree-sitter-python.wasm'];
for (const wasmFile of wasmFiles) {
  fs.copyFileSync(
    path.join(srcDir, wasmFile),
    path.join(destDir, wasmFile)
  );
}

console.log('✓ Copied tree-sitter runtime and grammar');
