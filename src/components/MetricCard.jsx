import React from 'react'

export default function MetricCard({ label, value, unit, sub, color = '#3b82f6', alert }) {
  return (
    <div style={{
      background: '#13131f',
      border: `1px solid ${alert ? '#ef444430' : '#ffffff12'}`,
      borderRadius: 12,
      padding: '20px 22px',
      flex: 1,
      minWidth: 0
    }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: alert ? '#ef4444' : color, letterSpacing: -1 }}>
          {value}
        </span>
        <span style={{ fontSize: 13, color: '#64748b' }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
