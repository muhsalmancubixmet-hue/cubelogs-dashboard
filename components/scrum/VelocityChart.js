'use client';

import React from 'react';

export default function VelocityChart({ data, velocityData }) {
  const rawObj = data || velocityData;
  const sprints = Array.isArray(rawObj) ? rawObj : (rawObj?.sprints || []);
  const avgVelocity = rawObj?.average_velocity ?? (sprints.length > 0 ? Math.round(sprints.reduce((acc, s) => acc + (s.completed_points || 0), 0) / sprints.length) : 0);

  if (!sprints || sprints.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 8 }}>
        No completed sprints available for velocity tracking yet.
      </div>
    );
  }

  const maxVal = Math.max(...sprints.map(v => Math.max(v.committed_points || 0, v.completed_points || 0, v.capacity || 0)), 1);

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
              Historical Sprint Velocity
            </h3>
            <span style={{ fontSize: 12, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, padding: '3px 10px', borderRadius: 12, border: '1px solid #bfdbfe' }}>
              Avg Velocity: {avgVelocity} pts/sprint
            </span>
          </div>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Completed story points over past sprints
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 500 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
            <span style={{ width: 12, height: 12, background: '#cbd5e1', borderRadius: 2 }} /> Committed Points
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a' }}>
            <span style={{ width: 12, height: 12, background: '#16a34a', borderRadius: 2 }} /> Completed Points
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, height: 180, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
        {sprints.map((sp) => {
          const commHeight = Math.round(((sp.committed_points || 0) / maxVal) * 140);
          const compHeight = Math.round(((sp.completed_points || 0) / maxVal) * 140);
          const tooltipText = `${sp.sprint_name} (${sp.sprint_key || `SPR-${sp.sprint_id || sp.id}`}): Committed: ${sp.committed_points || 0} pts, Completed: ${sp.completed_points || 0} pts`;

          return (
            <div key={sp.sprint_id || sp.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, width: '100%', justifyContent: 'center' }} title={tooltipText}>
                {/* Committed bar */}
                <div
                  style={{
                    width: '35%',
                    height: Math.max(commHeight, 4),
                    background: '#cbd5e1',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease',
                  }}
                />
                {/* Completed bar */}
                <div
                  style={{
                    width: '35%',
                    height: Math.max(compHeight, 4),
                    background: '#16a34a',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease',
                  }}
                />
              </div>
              <span style={{ fontSize: 12, color: '#475569', marginTop: 8, fontWeight: 500, whiteSpace: 'nowrap' }} title={tooltipText}>
                {sp.sprint_key || sp.sprint_name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
