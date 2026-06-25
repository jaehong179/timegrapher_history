import React, { useEffect, useState } from 'react'
import {
  fetchWatchHistory, monthlyDecayRate, projectOverhaulDate, DEFAULTS
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

// Health grade based on maxAbsRate (max daily rate across positions)
function computeGrade(records, decay) {
  const latest = records[0]
  if (!latest) return 'HEALTHY'
  const maxRate = latest.maxAbsRate ?? Math.abs(latest.summary?.rate ?? 0)
  const amp     = latest.avgAmplitude ?? latest.summary?.amplitude ?? 999
  const thr     = DEFAULTS.critical_threshold_amplitude

  if (maxRate > 10 || amp < thr + 10) return 'WARNING'
  if (maxRate > 5  || (decay != null && decay > 3.0)) return 'GOOD'
  if (maxRate <= 2 && amp >= DEFAULTS.baseline_amplitude - 20) return 'EXCELLENT'
  return 'HEALTHY'
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
  const decay   = monthlyDecayRate(sorted)
  const grade   = computeGrade(sorted, decay)
  const overhaul = projectOverhaulDate(sorted, DEFAULTS.critical_threshold_amplitude)

  // Data span
  const times    = sorted.map(r => new Date(r.measured_at).getTime())
  const spanDays = (Math.max(...times) - Math.min(...times)) / (1000 * 60 * 60 * 24)

  // Position anomaly flag
  const hasPositionAnomaly = latest.maxAbsRate > 5

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
          watchId={watchId}
          recordCount={records.length}
          lastMeasured={latest.measured_at}
        />
      </section>

      {/* Position anomaly banner */}
      {hasPositionAnomaly && (
        <div style={{
          marginBottom: 16, padding: '12px 16px',
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, marginBottom: 2 }}>
              Position Anomaly Detected
            </div>
            <div style={{ fontSize: 11, color: '#92400e' }}>
              The latest measurement shows daily rate exceeding ±5 s/d in some positions. Please review the per-position values.
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
          label="Daily Rate (DU)"
          value={latest.summary?.rate != null
            ? (latest.summary.rate > 0 ? `+${latest.summary.rate}` : String(latest.summary.rate))
            : '—'}
          unit="s/d"
          sub="Dial Up reference"
          color={Math.abs(latest.summary?.rate ?? 0) > 5 ? '#ef4444' : '#10b981'}
          alert={Math.abs(latest.summary?.rate ?? 0) > 10}
        />
        <MetricCard
          label="Avg Amplitude"
          value={latest.avgAmplitude ?? '—'}
          unit="°"
          sub={`Critical ${DEFAULTS.critical_threshold_amplitude}° / all-position avg`}
          color={(latest.avgAmplitude ?? 999) < DEFAULTS.critical_threshold_amplitude + 20 ? '#f59e0b' : '#3b82f6'}
        />
        <MetricCard
          label="Max Beat Error"
          value={latest.summary?.beat_error ?? '—'}
          unit="ms"
          sub="Max across positions / < 0.3ms OK"
          color={(latest.summary?.beat_error ?? 0) > 0.3 ? '#ef4444' : '#10b981'}
          alert={(latest.summary?.beat_error ?? 0) > 0.5}
        />
        <MetricCard
          label="Max Position Spread"
          value={`±${latest.maxAbsRate?.toFixed(1) ?? '—'}`}
          unit="s/d"
          sub="Max absolute across positions"
          color={!latest.maxAbsRate ? '#64748b' : latest.maxAbsRate > 10 ? '#ef4444' : latest.maxAbsRate > 5 ? '#f59e0b' : '#10b981'}
          alert={latest.maxAbsRate > 10}
        />
      </section>

      {/* Amplitude Trend */}
      <section style={cardStyle}>
        <SectionTitle>Amplitude Trend</SectionTitle>
        {spanDays < DEFAULTS.min_projection_days && (
          <div style={{
            fontSize: 11, color: '#f59e0b',
            background: 'rgba(245,158,11,0.08)', borderRadius: 6,
            padding: '6px 10px', marginBottom: 14,
            border: '1px solid rgba(245,158,11,0.2)'
          }}>
            ⚠ Measurement span is only {Math.round(spanDays)} days. Decay projection requires at least 30 days of data.
          </div>
        )}
        <AmplitudeTrend
          records={sorted}
          criticalThreshold={DEFAULTS.critical_threshold_amplitude}
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
