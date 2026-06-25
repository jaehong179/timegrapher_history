import React from 'react'

// Grade tiers reflect mechanical condition, set by the weakest of three
// indicators (amplitude, positional delta, beat error). See watchApi.js.
const GRADE_CONFIG = {
  EXCELLENT: { label: 'Excellent', color: '#10b981', bg: 'rgba(16,185,129,0.12)', desc: 'All condition indicators are in the top band.' },
  GOOD:      { label: 'Good', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', desc: 'All indicators within the healthy range.' },
  FAIR:      { label: 'Fair', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', desc: 'An indicator is in the caution band — monitor it.' },
  WARNING:   { label: 'Service', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  desc: 'An indicator is below threshold — service recommended.' },
}

export default function HealthGrade({ grade, limiting, watchId, recordCount, lastMeasured }) {
  const cfg = GRADE_CONFIG[grade] || GRADE_CONFIG.GOOD
  const lastDate = lastMeasured
    ? new Date(lastMeasured).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    : '—'

  return (
    <div style={{
      background: 'linear-gradient(135deg, #13131f 0%, #1a1a2e 100%)',
      border: `1px solid ${cfg.color}44`,
      borderRadius: 16,
      padding: '24px 28px',
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      boxShadow: `0 0 40px ${cfg.color}14`
    }}>
      {/* Grade badge */}
      <div style={{
        width: 96, height: 96, borderRadius: '50%',
        background: cfg.bg,
        border: `2px solid ${cfg.color}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        padding: 6,
        boxShadow: `0 0 20px ${cfg.color}35`
      }}>
        <span style={{ fontSize: 9, color: cfg.color, fontWeight: 600, letterSpacing: 1, opacity: 0.7 }}>GRADE</span>
        <span style={{ fontSize: 15, color: cfg.color, fontWeight: 700, lineHeight: 1.2, textAlign: 'center' }}>{cfg.label}</span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <h1 style={{
            fontSize: 18, fontWeight: 700, color: '#f1f5f9',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>{watchId}</h1>
        </div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>
          Last measured: {lastDate} &nbsp;·&nbsp; {recordCount} records
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: cfg.bg, borderRadius: 8, padding: '5px 12px',
          fontSize: 12, color: cfg.color, fontWeight: 500
        }}>
          {cfg.desc}
        </div>
        {limiting && (
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
            Driven by <span style={{ color: '#94a3b8', fontWeight: 600 }}>{limiting.label}</span>: {limiting.value}{limiting.unit}
          </div>
        )}
      </div>
    </div>
  )
}
