import React from 'react'

const ICONS = { MAGNETISM: '🧲', DECAY: '⚠️', SHOCK: '💥' }
const COLORS = { WARNING: '#f59e0b', CRITICAL: '#ef4444', INFO: '#3b82f6' }

export default function AlertBanner({ alert }) {
  if (!alert) return null
  const color = COLORS[alert.severity] || '#f59e0b'
  const icon  = ICONS[alert.type] || '⚠️'

  return (
    <div style={{
      background: `${color}0f`,
      border: `1px solid ${color}44`,
      borderRadius: 10,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 6
    }}>
      <span style={{ fontSize: 16, lineHeight: 1.4 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 2 }}>
          {alert.message}
        </div>
        {alert.resolved && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(16,185,129,0.12)', borderRadius: 6,
            padding: '2px 8px', fontSize: 11, color: '#10b981', marginTop: 4
          }}>
            ✓ {alert.resolved_label}
          </div>
        )}
      </div>
    </div>
  )
}
