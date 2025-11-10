/**
 * Expandable sweep heading item for Table of Contents
 */

import React, { useState } from 'react';
import { ParsedSweep } from './parser';

interface SweepHeadingItemProps {
  sweep: ParsedSweep;
  icon: string;
  onClick?: () => void;
}

/**
 * Expandable sweep heading with info box
 */
export const SweepHeadingItem: React.FC<SweepHeadingItemProps> = ({
  sweep,
  icon,
  onClick
}) => {
  const [expanded, setExpanded] = useState(false);
  const { type, name, metrics, flags, complete } = sweep;

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setExpanded(!expanded);
    }
  };

  const handleHeadingClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Render parameter rows for info box
  const renderParameters = () => {
    const params: Array<{ label: string; value: string }> = [];

    switch (type) {
      case 'sweep0d':
        if (metrics.maxTime) params.push({ label: 'Max Time', value: `${metrics.maxTime} s` });
        if (metrics.interDelay) params.push({ label: 'Interval', value: `${metrics.interDelay} s` });
        if (metrics.plotBin) params.push({ label: 'Plot Bin', value: metrics.plotBin });
        if (metrics.xAxisTime) params.push({ label: 'X-Axis Time', value: metrics.xAxisTime });
        break;

      case 'sweep1d':
        if (metrics.setParam) params.push({ label: 'Parameter', value: metrics.setParam });
        if (metrics.start) params.push({ label: 'Start', value: metrics.start });
        if (metrics.stop) params.push({ label: 'Stop', value: metrics.stop });
        if (metrics.step) params.push({ label: 'Step', value: metrics.step });
        if (metrics.interDelay) params.push({ label: 'Delay', value: `${metrics.interDelay} s` });
        if (metrics.xAxisTime) params.push({ label: 'X-Axis Time', value: metrics.xAxisTime });
        break;

      case 'sweep2d':
        if (metrics.innerSweep) params.push({ label: 'Inner Sweep', value: metrics.innerSweep });
        if (metrics.outerSweep) params.push({ label: 'Outer Sweep', value: metrics.outerSweep });
        break;

      case 'simulsweep':
      case 'sweepqueue':
        // These typically don't have individual parameters
        break;
    }

    return params;
  };

  // Render flags section
  const renderFlags = () => {
    const flagList: Array<{ label: string; icon: string }> = [];

    if (flags.bidirectional) flagList.push({ label: 'Bidirectional', icon: '↔' });
    if (flags.continual) flagList.push({ label: 'Continual', icon: '∞' });
    if (flags.plotData) flagList.push({ label: 'Plot Data', icon: '📊' });
    if (flags.saveData) flagList.push({ label: 'Save Data', icon: '💾' });

    return flagList;
  };

  const parameters = renderParameters();
  const flagList = renderFlags();
  const hasInfo = parameters.length > 0 || flagList.length > 0;

  return (
    <div className="jp-TocSweep">
      <div className="jp-TocSweep-heading" onClick={handleHeadingClick}>
        <span className="jp-TocSweep-icon">{icon}</span>
        <span className="jp-TocSweep-name">{name}</span>
        {!complete && (
          <span className="jp-TocSweep-warning" title="Some parameters missing">
            ⚠
          </span>
        )}
        {hasInfo && (
          <button
            className="jp-TocSweep-toggle"
            onClick={toggleExpanded}
            onKeyDown={handleKeyDown}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            title={expanded ? 'Hide details' : 'Show details'}
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        {!hasInfo && (
          <span className="jp-TocSweep-unavailable" title="Details unavailable">
            …
          </span>
        )}
      </div>

      {expanded && hasInfo && (
        <div className="jp-TocSweep-info" aria-hidden={!expanded}>
          <div className="jp-TocSweep-info-content">
            {parameters.length > 0 && (
              <div className="jp-TocSweep-info-section">
                <div className="jp-TocSweep-info-title">Parameters</div>
                <div className="jp-TocSweep-info-grid">
                  {parameters.map((param, i) => (
                    <React.Fragment key={i}>
                      <div className="jp-TocSweep-info-label">{param.label}</div>
                      <div className="jp-TocSweep-info-value">{param.value}</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {flagList.length > 0 && (
              <div className="jp-TocSweep-info-section">
                <div className="jp-TocSweep-info-title">Flags</div>
                <div className="jp-TocSweep-info-flags">
                  {flagList.map((flag, i) => (
                    <div key={i} className="jp-TocSweep-info-flag">
                      <span className="jp-TocSweep-info-flag-icon">{flag.icon}</span>
                      <span className="jp-TocSweep-info-flag-label">{flag.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
