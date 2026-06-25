import React, { useState } from 'react'
import { POSITION_LABELS } from '../api/watchApi.js'

function RateDisplay({ rate }) {
  if (rate == null) return <span style={{ color: '#475569' }}>—</span>
  const abs = Math.abs(rate)
  const color = abs > 10 ? '#ef4444' : abs > 5 ? '#f59e0b' : abs > 2 ? '#facc15' : '#10b981'
  return (
    <span style={{ color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
      {rate > 0 ? '+' : ''}{rate} s/d
    </span>
  )
}

function AnomalyBadge({ record }) {
  const rate = Math.abs(record.summary?.rate ?? 0)
  if (rate > 10) return (
    <span style={{
      fontSize: 10, background: 'rgba(239,68,68,0.15)', color: '#ef4444',
      borderRadius: 5, padding: '1px 7px', fontWeight: 600
    }}>⚠ Anomaly</span>
  )
  return null
}

function SessionCard({ record, isLatest }) {
  const [open, setOpen] = useState(isLatest)
  const date = new Date(record.measured_at)
  const dateStr = date.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
  const m = record.measurements || {}
  const hasAnomaly = Math.abs(record.summary?.rate ?? 0) > 10

  return (
    <div style={{
      background: '#13131f',
      border: `1px solid ${isLatest ? 'rgba(59,130,246,0.3)' : hasAnomaly ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 12, overflow: 'hidden'
    }}>
      {/* Header */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left'
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: hasAnomaly ? '#ef4444' : isLatest ? '#3b82f6' : '#334155'
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{dateStr}</span>
            <span style={{ fontSize: 11, color: '#475569' }}>{timeStr}</span>
            {isLatest && (
              <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>Latest</span>
            )}
            <AnomalyBadge record={record} />
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Rate (DU) <RateDisplay rate={record.summary?.rate} />
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Amplitude <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{record.summary?.amplitude ?? '—'}°</span>
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Beat Error <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{record.summary?.beat_error ?? '—'} ms</span>
            </span>
          </div>
        </div>
        <span style={{ color: '#475569', fontSize: 11, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Expanded */}
      {open && (
        <div style={{ padding: '0 20px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>

          {/* Comment */}
          {record.comment && (
            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: 'rgba(255,255,255,0.03)', borderRadius: 8,
              borderLeft: '2px solid rgba(59,130,246,0.4)'
            }}>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{record.comment}</div>
            </div>
          )}

          {/* Position table */}
          {Object.keys(m).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Per-Position Measurements
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    {['Code', 'Position', 'Rate', 'Amplitude', 'Beat Error'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', color: '#475569', padding: '3px 10px 6px 0',
                        fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.06)'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(m).map(([code, v]) => (
                    <tr key={code}>
                      <td style={{ padding: '5px 10px 5px 0' }}>
                        <span style={{
                          background: 'rgba(59,130,246,0.12)', color: '#60a5fa',
                          borderRadius: 4, padding: '1px 6px', fontWeight: 600, fontSize: 10
                        }}>{code}</span>
                      </td>
                      <td style={{ padding: '5px 10px 5px 0', color: '#94a3b8' }}>
                        {POSITION_LABELS[code] || code}
                      </td>
                      <td style={{ padding: '5px 10px 5px 0' }}><RateDisplay rate={v.rate} /></td>
                      <td style={{ padding: '5px 10px 5px 0', color: '#e2e8f0', fontWeight: 500 }}>{v.amplitude}°</td>
                      <td style={{ padding: '5px 10px 5px 0', color: '#94a3b8' }}>{v.beat_error} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MetricsHistory({ records }) {
  const sorted = [...records].sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map((r, i) => (
        <SessionCard key={r.measured_at + i} record={r} isLatest={i === 0} />
      ))}
    </div>
  )
}
