/**
 * QMeasure Jupyter - JupyterLab extension for MeasureIt sweep management
 */

import sweepManagerPlugin from './plugin';
import tocPlugin from './toc/plugin';

// Export both plugins as an array
export default [sweepManagerPlugin, tocPlugin];
