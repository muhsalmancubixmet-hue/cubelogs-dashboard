'use client';

import React from 'react';

export default function BurndownChart({ burndownData }) {
  if (!burndownData || !burndownData.timeline || burndownData.timeline.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 8 }}>
        No burndown telemetry recorded yet for this sprint.
      </div>
    );
  }

  const timeline = burndownData.timeline;
  const maxPts = Math.max(...timeline.map(t => Math.max(t.total_points, t.remaining_points, t.ideal_remaining)), 1);

  const svgWidth = 600;
  const svgHeight = 220;
  const padding = 40;

  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  const pointsCount = timeline.length;
  const stepX = pointsCount > 1 ? chartWidth / (pointsCount - 1) : chartWidth;

  const getX = (idx) => padding + idx * stepX;
  const getY = (val) => svgHeight - padding - (val / maxPts) * chartHeight;

  // Polyline coordinates for Ideal line
  const idealPointsStr = timeline
    .map((t, i) => `${getX(i)},${getY(t.ideal_remaining)}`)
    .join(' ');

  // Polyline coordinates for Remaining points line
  const remainingPointsStr = timeline
    .map((t, i) => `${getX(i)},${getY(t.remaining_points)}`)
    .join(' ');

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
            Sprint Burndown ({burndownData.sprint_name})
          </h3>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Initial committed: {burndownData.initial_points} story points
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 500 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
            <span style={{ width: 12, height: 2, borderTop: '2px dashed #94a3b8', display: 'inline-block' }} /> Ideal Burn
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2563eb' }}>
            <span style={{ width: 12, height: 3, background: '#2563eb', borderRadius: 2, display: 'inline-block' }} /> Remaining Points
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', maxHeight: 240 }}>
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = svgHeight - padding - pct * chartHeight;
            const val = Math.round(pct * maxPts);
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={padding - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Ideal line (dashed) */}
          <polyline fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" points={idealPointsStr} />

          {/* Actual Remaining line (solid blue) */}
          <polyline fill="none" stroke="#2563eb" strokeWidth="3" points={remainingPointsStr} />

          {/* Data Points */}
          {timeline.map((t, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(t.remaining_points)}
              r="4"
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth="2"
            >
              <title>{`${t.date}: ${t.remaining_points} pts remaining`}</title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
}
