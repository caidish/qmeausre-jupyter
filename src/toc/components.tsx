/**
 * React components for rendering sweep headings in Table of Contents
 */

import React from 'react';
import { ParsedSweep } from './parser';

interface SweepHeadingViewProps {
  sweep: ParsedSweep;
  icon: string;
}

/**
 * Polished sweep heading component with structured layout
 */
export const SweepHeadingView: React.FC<SweepHeadingViewProps> = ({ sweep, icon }) => {
  const { type, name, metrics, flags, complete } = sweep;

  // Build metrics display based on sweep type
  const renderMetrics = () => {
    const parts: string[] = [];

    switch (type) {
      case 'sweep0d':
        if (metrics.maxTime) parts.push(`max ${metrics.maxTime} s`);
        if (metrics.interDelay) parts.push(`Δt ${metrics.interDelay} s`);
        if (metrics.plotBin) parts.push(`bin ${metrics.plotBin}`);
        break;

      case 'sweep1d':
        const param = metrics.setParam || '…';
        const start = metrics.start || '…';
        const stop = metrics.stop || '…';
        const step = metrics.step || '…';
        parts.push(`${param} ${start} → ${stop} @ ${step}`);
        break;

      case 'sweep2d':
        if (metrics.innerSweep) parts.push(`inner:${metrics.innerSweep}`);
        if (metrics.outerSweep) parts.push(`outer:${metrics.outerSweep}`);
        break;

      case 'simulsweep':
        parts.push('simultaneous');
        break;

      case 'sweepqueue':
        parts.push('sweep queue');
        break;
    }

    return parts.length > 0 ? parts.join(' · ') : '…';
  };

  // Build flags display
  const renderFlags = () => {
    const badges: string[] = [];

    if (flags.bidirectional) badges.push('↔ bidir');
    if (flags.continual) badges.push('∞ cont');
    if (flags.saveData) badges.push('💾 save');

    return badges;
  };

  const metricsText = renderMetrics();
  const flagBadges = renderFlags();

  return (
    <div className="jp-TableOfContents-sweepHeading">
      <span className="jp-TableOfContents-sweepIcon">{icon}</span>
      <span className="jp-TableOfContents-sweepName">{name}</span>
      <span className="jp-TableOfContents-sweepSeparator">—</span>
      <span className="jp-TableOfContents-sweepMetrics" title={metricsText}>
        {metricsText}
      </span>
      {flagBadges.length > 0 && (
        <span className="jp-TableOfContents-sweepFlags">
          {flagBadges.map((badge, i) => (
            <span key={i} className="jp-TableOfContents-sweepBadge">
              {badge}
            </span>
          ))}
        </span>
      )}
      {!complete && (
        <span className="jp-TableOfContents-sweepIncomplete" title="Some parameters missing">
          ⚠
        </span>
      )}
    </div>
  );
};

/**
 * Format sweep as polished text for ToC display
 */
export function formatSweepAsText(sweep: ParsedSweep, icon: string): string {
  const { type, name, metrics, flags, complete } = sweep;
  const parts: string[] = [icon, name];

  // Add metrics based on type
  switch (type) {
    case 'sweep0d':
      const sweep0dMetrics: string[] = [];
      if (metrics.maxTime) sweep0dMetrics.push(`max ${metrics.maxTime} s`);
      if (metrics.interDelay) sweep0dMetrics.push(`Δt ${metrics.interDelay} s`);
      if (metrics.plotBin) sweep0dMetrics.push(`bin ${metrics.plotBin}`);
      if (sweep0dMetrics.length > 0) {
        parts.push('—', sweep0dMetrics.join(' · '));
      }
      break;

    case 'sweep1d':
      const param = metrics.setParam || '…';
      const start = metrics.start || '…';
      const stop = metrics.stop || '…';
      const step = metrics.step || '…';
      parts.push('—', `${param} ${start} → ${stop} @ ${step}`);
      break;

    case 'sweep2d':
      const sweep2dMetrics: string[] = [];
      if (metrics.innerSweep) sweep2dMetrics.push(`inner:${metrics.innerSweep}`);
      if (metrics.outerSweep) sweep2dMetrics.push(`outer:${metrics.outerSweep}`);
      if (sweep2dMetrics.length > 0) {
        parts.push('—', sweep2dMetrics.join(' | '));
      }
      break;

    case 'simulsweep':
      parts.push('—', 'simultaneous');
      break;

    case 'sweepqueue':
      parts.push('—', 'sweep queue');
      break;
  }

  // Add flags
  const flagBadges: string[] = [];
  if (flags.bidirectional) flagBadges.push('↔');
  if (flags.continual) flagBadges.push('∞');
  if (flags.saveData) flagBadges.push('💾');

  if (flagBadges.length > 0) {
    parts.push('·', flagBadges.join(' '));
  }

  // Add warning if incomplete
  if (!complete) {
    parts.push('⚠');
  }

  return parts.join(' ');
}

/**
 * Format sweep as plain text (fallback for regex-based detection)
 */
export function formatSweepFallback(
  type: string,
  name: string,
  icon: string
): string {
  return `${icon} ${name} — …`;
}
