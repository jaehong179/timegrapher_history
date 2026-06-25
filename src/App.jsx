import React, { useEffect, useState } from 'react'
import {
  fetchWatchHistory, computeHealth, DEFAULTS
} from './api/watchApi.js'
import HealthGrade from './components/HealthGrade.jsx'
import MetricCard from './components/MetricCard.jsx'
import AmplitudeTrend from './components/AmplitudeTrend.jsx'
import MetricsHistory from './components/MetricsHistory.jsx'

function getWatchId() {
  const p = new URLSearchParams(window.location.search)
  return (
    p.get('watch_id') ||
    p.get('serial') ||
    p.get('s') ||
    window.location.pathname.split('/').filter(Boolean).pop() ||
    'DEMO-3235'
  )
}

export default function App() {
  const [records, setRecords] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const watchId = getWatchId()
  const isDemo  = watchId.toUpperCase().startsWith('DEMO')

  useEffect(() => {
    fetchWatchHistory(watchId)
      .then(setRecords)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [watchId])

  if (loading) return (
    <div style={centerStyle}>
      <div style={spinnerStyle} />
      <p style={{ color: '#475569', marginTop: 16, fontSize: 13 }}>Loading data…</p>
    </div>
  )

  if (error) return (
    <div style={centerStyle}>
      <p style={{ color: '#ef4444', fontSize: 14 }}>Failed to load data.</p>
      <p style={{ color: '#475569', fontSize: 12, marginTop: 6 }}>{error}</p>
    </div>
  )

  if (!records || records.length === 0) return (
    <div style={centerStyle}>
      <p style={{ color: '#f59e0b', fontSize: 14 }}>No measurement records found.</p>
      <p style={{ color: '#475569', fontSize: 12, marginTop: 6 }}>watch_id: {watchId}</p>
    </div>
  )

  // Sort newest first
  const sorted  = [...records].sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))
  const latest  = sorted[0]
  const health  = computeHealth(latest)
  const grade   = health.grade
  const limiting = health.limiting

  // Caution banner when the grade is limited by an indicator in caution/below range
  const showCaution = limiting && limiting.level <= 2

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 60px' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>⌚</span>
          <span style={{ fontSize: 12, color: '#475569', fontWeight: 500, letterSpacing: 0.5 }}>
            TIMEGRAPHER HISTORY
          </span>
        </div>
        {isDemo && (
          <span style={{ fontSize: 10, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', borderRadius: 6, padding: '3px 9px', fontWeight: 600 }}>
            DEMO
          </span>
        )}
      </div>

      {/* Health Grade */}
      <section style={{ marginBottom: 20 }}>
        <HealthGrade
          grade={grade}
          limiting={limiting}
          watchId={watchId}
          recordCount={records.length}
          lastMeasured={latest.measured_at}
        />
      </section>

      {/* Caution banner — explains the limiting indicator */}
      {showCaution && (
        <div style={{
          marginBottom: 16, padding: '12px 16px',
          background: limiting.level === 1 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${limiting.level === 1 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
          borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 12, color: limiting.level === 1 ? '#ef4444' : '#f59e0b', fontWeight: 600, marginBottom: 2 }}>
              {limiting.level === 1 ? 'Service Recommended' : 'Monitor This Indicator'}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Grade is limited by <strong>{limiting.label}</strong> at {limiting.value}{limiting.unit}
              {' '}({limiting.level === 1 ? 'below threshold' : 'caution band'}). Review the per-position values below.
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10, marginBottom: 20
      }}>
        <MetricCard
          label="Amplitude"
          value={latest.horizontalAmplitude ?? '—'}
          unit="°"
          sub={`Horizontal · healthy ≥270° · service ≤${DEFAULTS.critical_threshold_amplitude}°`}
          color={(latest.horizontalAmplitude ?? 999) < DEFAULTS.critical_threshold_amplitude ? '#ef4444'
               : (latest.horizontalAmplitude ?? 999) < 270 ? '#f59e0b' : '#10b981'}
          alert={(latest.horizontalAmplitude ?? 999) < DEFAULTS.critical_threshold_amplitude}
        />
        <MetricCard
          label="Positional Δ"
          value={`±${latest.positionalDelta?.toFixed(1) ?? '—'}`}
          unit="s/d"
          sub="Rate spread across positions · ≤15 good"
          color={!latest.positionalDelta ? '#64748b' : latest.positionalDelta > 25 ? '#ef4444' : latest.positionalDelta > 15 ? '#f59e0b' : '#10b981'}
          alert={latest.positionalDelta > 25}
        />
        <MetricCard
          label="Beat Error"
          value={latest.maxBeatError ?? '—'}
          unit="ms"
          sub="Max across positions · < 0.7ms good"
          color={(latest.maxBeatError ?? 0) > 1.0 ? '#ef4444' : (latest.maxBeatError ?? 0) > 0.7 ? '#f59e0b' : '#10b981'}
          alert={(latest.maxBeatError ?? 0) > 1.0}
        />
        <MetricCard
          label="Daily Rate (DU)"
          value={latest.summary?.rate != null
            ? (latest.summary.rate > 0 ? `+${latest.summary.rate}` : String(latest.summary.rate))
            : '—'}
          unit="s/d"
          sub="Accuracy / regulation — not health"
          color="#3b82f6"
        />
      </section>

      {/* Amplitude Trend */}
      <section style={cardStyle}>
        <SectionTitle>Amplitude Trend</SectionTitle>
        <AmplitudeTrend
          records={sorted}
          serviceThreshold={DEFAULTS.critical_threshold_amplitude}
          baseline={DEFAULTS.baseline_amplitude}
        />
      </section>

      {/* History */}
      <section style={{ marginTop: 20 }}>
        <SectionTitle>Inspection History ({records.length})</SectionTitle>
        <MetricsHistory records={sorted} />
      </section>

      <div style={{ marginTop: 40, textAlign: 'center', fontSize: 11, color: '#1e293b' }}>
        Timegrapher History · {watchId}
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', letterSpacing: 0.6, marginBottom: 16, textTransform: 'uppercase' }}>
      {children}
    </h2>
  )
}

const cardStyle = {
  background: '#13131f',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 14,
  padding: '22px 22px'
}

const centerStyle = {
  height: '100vh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center'
}

const spinnerStyle = {
  width: 32, height: 32, borderRadius: '50%',
  border: '3px solid rgba(59,130,246,0.2)',
  borderTopColor: '#3b82f6',
  animation: 'spin 0.8s linear infinite'
}

if (typeof document !== 'undefined') {
  const s = document.createElement('style')
  s.textContent = '@keyframes spin { to { transform: rotate(360deg) } }'
  document.head.appendChild(s)
}
