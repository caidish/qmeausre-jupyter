# QMeasure Jupyter

[![PyPI](https://img.shields.io/pypi/v/qmeasure-jupyter.svg)](https://pypi.org/project/qmeasure-jupyter)

A JupyterLab extension providing a beginner-friendly GUI for the [MeasureIt](https://github.com/nanophys/MeasureIt) sweep measurement package.

The extension is written with claude code. A TODO plan history is provided. 

## Features

### Sweep Creation

- 📊 **Complete Sweep Support** - Forms for Sweep0D, Sweep1D, Sweep2D, and SimulSweep
- ⚡ **Fast Sweeps** - Quick templates for Sweepto and GateLeakage measurements
- 📝 **Smart Code Templates** - Generates production-ready Python code with proper syntax
- 🔧 **Flexible Validation** - Client-side validation that won't block code generation
- 🎯 **Custom Parameters** - Add arbitrary keyword arguments to sweep constructors

### Queue Manager

- 📋 **Build Sweep Queues** - Add sweeps to execution queues with database integration
- ✏️ **Edit Queue Entries** - Modify queued sweeps with form auto-fill
- 🔄 **Reorder & Organize** - Drag/reorder queue entries, duplicate sweeps
- 💾 **Database Integration** - Supports both inline and variable DatabaseEntry references
- 🚀 **Export Queue Scripts** - Generate complete, runnable queue code

### Advanced Analytics

- 🔍 **Cross-Cell Tracking** - Detects sweeps and queue entries across all notebook cells
- 📊 **Queue Position Display** - Shows "Position X of Y" for queued sweeps
- 🔁 **Loop Context Detection** - Identifies sweeps defined in FOR/WHILE loops
- ⚙️ **Function Context** - Tracks sweeps inside function definitions
- 🌳 **Tree-Sitter Parser** - Robust AST parsing for accurate code analysis

### User Experience

- 💾 **Form Persistence** - Automatically saves form inputs to localStorage
- 🔄 **Reset to Defaults** - Clear saved values with one click
- ❓ **Inline Help** - Hover over (?) icons to see parameter descriptions
- 🎨 **Visual Feedback** - Badges for queued sweeps, fast sweeps, loop/function context

## Requirements

- JupyterLab >= 4.0.0
- Python >= 3.8
- qmeasure (MeasureIt)

## Development Install

Note: You will need NodeJS to build the extension package.

```bash
# Clone the repo to your local environment
cd qmeasure-jupyter

# Install package in development mode
pip install -e ".[dev]"

# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite

# Server extension must be manually installed in develop mode
jupyter server extension enable qmeasure_jupyter

# Rebuild extension TypeScript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch

# Run JupyterLab in another terminal
jupyter lab
```

## Quick Start

### Basic Usage

1. **Open JupyterLab** and create or open a notebook
2. **Find "Sweep Manager"** in the left sidebar
3. **Select sweep type** using the tabs (Sweep0D, 1D, 2D, or SimulSweep)
4. **Fill in parameters** - hover over (?) icons for help
5. **Click "Generate Code"** to insert into the active cell
6. **Run the cell** (Shift+Enter) to execute your sweep

### Example: Creating a 1D Gate Sweep

```python
# 1. In the Sweep1D tab, fill in:
Name: gate_sweep
Set Parameter: station.dac.ch1
Start: -1
Stop: 1
Step: 0.1
Follow Parameters: station.dmm.voltage, station.lockin.X

# 2. Click "Generate Code" - this is inserted:
set_param = station.dac.ch1

gate_sweep = Sweep1D(
    set_param=set_param,
    start=-1,
    stop=1,
    step=0.1,
    save_data=True,
    plot_data=True
)

gate_sweep.follow_param(station.dmm.voltage)
gate_sweep.follow_param(station.lockin.X)

gate_sweep.start()

# 3. Run the cell to execute the sweep
```

### Next Steps

- Check the **Table of Contents** at the bottom of the Sweep Manager to see all detected sweeps
- Click on any sweep name to view its details in the **right sidebar**
- Use **"Reset to Defaults"** button to clear saved form values
- See [USAGE.md](USAGE.md) for comprehensive documentation

## Documentation

- **[USAGE.md](USAGE.md)** - Comprehensive user guide with examples
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development setup and contribution guidelines
- **[TODO.md](TODO.md)** - Development roadmap and progress tracking

## Supported Sweep Types

| Sweep Type     | Use Case                            | Example                                 |
| -------------- | ----------------------------------- | --------------------------------------- |
| **Sweep0D**    | Point measurements without sweeping | Measure current at fixed voltage        |
| **Sweep1D**    | 1D parameter sweeps                 | Gate voltage sweep from -1V to 1V       |
| **Sweep2D**    | 2D nested sweeps                    | Gate voltage vs. magnetic field map     |
| **SimulSweep** | Simultaneous multi-parameter sweeps | Sweep two gates while maintaining ratio |

## Key Features Explained

### Follow Parameters

Measure additional parameters at each sweep point without controlling them:

```python
# Follow parameters are measured but not swept
gate_sweep.follow_param(station.dmm.voltage)
gate_sweep.follow_param(station.lockin.X)
```

### Custom Parameters

Pass arbitrary keyword arguments to sweep constructors:

```python
# Add custom metadata or configuration
s_1D = Sweep1D(
    ...,
    temperature=300,      # Custom parameter
    sample_name="DeviceA" # Custom parameter
)
```

### Form Persistence

Your form inputs are automatically saved to browser localStorage and restored when you reopen JupyterLab. Click "Reset to Defaults" to clear saved values.

### Table of Contents

The extension automatically detects sweep objects in your notebook using tree-sitter parsing. Click any sweep in the ToC to view its configuration in the right sidebar.

## Contributing

See [DEVELOPMENT.md](DEVELOPMENT.md) for development guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

Built for the [MeasureIt](https://github.com/nanophys/MeasureIt) measurement framework, developed at the University of Washington.
