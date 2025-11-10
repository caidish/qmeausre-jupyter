# QMeasure Jupyter - Development TODO

## ✅ Week 1: Environment Setup & Scaffold (COMPLETED)
- [x] Initialize project with modern hybrid structure
- [x] Set up TypeScript/React/webpack build pipeline
- [x] Create basic sidebar panel that renders in JupyterLab
- [x] Verify build workflow: `jlpm build` → `pip install -e .`
- [x] Fixed Yarn PnP compatibility issue (switched to node-modules)
- [x] Successfully installed and verified extension in JupyterLab

## ✅ Week 2: Core UI Components (COMPLETED)
- [x] Build SweepManager with tabbed interface
- [x] Create forms for Sweep0D, Sweep1D, Sweep2D
- [x] Implement text inputs for all parameters
- [x] Add client-side validation (numbers, required fields, non-blocking)
- [ ] Add "Custom Parameters" key-value component (deferred to future)

## ✅ Week 3: Code Generation & Integration (COMPLETED)
- [x] Implement static code templates
- [x] Add template parameter substitution with _required placeholders
- [x] Integrate JupyterLab cell insertion API
- [x] Added toPython() helper for proper Python literal conversion
- [x] Non-blocking validation - generates code even with missing required fields

## 📅 Week 4: Polish & Release
- [ ] Add tooltips and help text
- [ ] Implement form persistence (localStorage)
- [ ] Write basic documentation
- [ ] Package and test installation
- [ ] Release v0.1.0 to lab for testing

## Current Status

### What's Working
- ✅ Complete JupyterLab extension with sidebar panel
- ✅ Sweep0D, Sweep1D, Sweep2D forms with all MeasureIt parameters
- ✅ Code generation with _required placeholders for missing fields
- ✅ Direct insertion into Jupyter notebook cells
- ✅ Non-blocking validation (shows errors but still generates code)
- ✅ Proper Python boolean/literal conversion (True/False)

### Known Issues
- SimulSweep form is placeholder only (not yet implemented)

### Next Steps
1. Test the extension in JupyterLab (hard refresh: Cmd+Shift+R)
2. Verify generated code works with MeasureIt
3. Optional: Add tooltips/help text (Week 4)
4. Optional: Implement form persistence (Week 4)

## Notes
- Using node-modules instead of Yarn PnP for JupyterLab compatibility
- TypeScript configured with `skipLibCheck: true` to avoid dependency type errors
- Extension runs in development mode with symlinked labextension directory
