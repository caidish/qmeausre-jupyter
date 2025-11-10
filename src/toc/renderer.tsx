/**
 * Custom ToC renderer that wraps sweep headings with expandable components
 */

import React from 'react';
import { ISweepHeading } from './model';
import { SweepHeadingItem } from './SweepHeadingItem';

interface SweepHeadingRendererProps {
  heading: ISweepHeading;
  onClick: () => void;
}

/**
 * Icon map for sweep types
 */
const SWEEP_ICONS: Record<string, string> = {
  sweep0d: '⏱',
  sweep1d: '📈',
  sweep2d: '📊',
  simulsweep: '🔄',
  sweepqueue: '📋'
};

/**
 * Renders a sweep heading with expandable info box
 */
export const SweepHeadingRenderer: React.FC<SweepHeadingRendererProps> = ({
  heading,
  onClick
}) => {
  // Check if this is a sweep heading with full data
  if (heading.sweepData && heading.sweepType) {
    const icon = SWEEP_ICONS[heading.sweepType] || '📊';
    return (
      <SweepHeadingItem
        sweep={heading.sweepData}
        icon={icon}
        onClick={onClick}
      />
    );
  }

  // Fallback to plain text rendering for non-sweep or incomplete headings
  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      {heading.text}
    </div>
  );
};
