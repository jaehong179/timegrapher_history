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

// maxAbsRate 기반 건강 등급 (자세별 최대 일오차 사용)
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
      <p style={{ color: '#475569', marginTop: 16, fontSize: 13 }}>데이터 불러오는 중…</p>
    </div>
  )

  if (error) return (
    <div style={centerStyle}>
      <p style={{ color: '#ef4444', fontSize: 14 }}>데이터를 불러오지 못했습니다.</p>
      <p style={{ color: '#475569', fontSize: 12, marginTop: 6 }}>{error}</p>
    </div>
  )

  if (!records || records.length === 0) return (
    <div style={centerStyle}>
      <p style={{ color: '#f59e0b', fontSize: 14 }}>측정 기록이 없습니다.</p>
      <p style={{ color: '#475569', fontSize: 12, marginTop: 6 }}>watch_id: {watchId}</p>
    </div>
  )

  // 최신순 정렬
  const sorted  = [...records].sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))
  const latest  = sorted[0]
  const decay   = monthlyDecayRate(sorted)
  const grade   = computeGrade(sorted, decay)
  const overhaul = projectOverhaulDate(sorted, DEFAULTS.critical_threshold_amplitude)

  // 데이터 기간 계산
  const times    = sorted.map(r => new Date(r.measured_at).getTime())
  const spanDays = (Math.max(...times) - Math.min(...times)) / (1000 * 60 * 60 * 24)

  // 최대 자세별 일오차 이상 여부
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
          lastEngineer={latest.engineer}
        />
      </section>

      {/* 자세별 이상감지 배너 */}
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
              자세별 이상 감지
            </div>
            <div style={{ fontSize: 11, color: '#92400e' }}>
              최신 측정에서 일부 자세의 일오차가 ±5 s/d를 초과합니다. 자세별 측정값을 확인하세요.
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <section style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <MetricCard
          label="일오차 (DU)"
          value={latest.summary?.rate != null
            ? (latest.summary.rate > 0 ? `+${latest.summary.rate}` : String(latest.summary.rate))
            : '—'}
          unit="s/d"
          sub="Dial Up 기준"
          color={Math.abs(latest.summary?.rate ?? 0) > 5 ? '#ef4444' : '#10b981'}
          alert={Math.abs(latest.summary?.rate ?? 0) > 10}
        />
        <MetricCard
          label="평균 진각"
          value={latest.avgAmplitude ?? '—'}
          unit="°"
          sub={`임계선 ${DEFAULTS.critical_threshold_amplitude}° / 전 자세 평균`}
          color={(latest.avgAmplitude ?? 999) < DEFAULTS.critical_threshold_amplitude + 20 ? '#f59e0b' : '#3b82f6'}
        />
        <MetricCard
          label="최대 비트오차"
          value={latest.summary?.beat_error ?? '—'}
          unit="ms"
          sub="전 자세 최대값 / < 0.3ms 정상"
          color={(latest.summary?.beat_error ?? 0) > 0.3 ? '#ef4444' : '#10b981'}
          alert={(latest.summary?.beat_error ?? 0) > 0.5}
        />
        <MetricCard
          label="최대 자세 편차"
          value={`±${latest.maxAbsRate?.toFixed(1) ?? '—'}`}
          unit="s/d"
          sub="전 자세 최대 절댓값"
          color={!latest.maxAbsRate ? '#64748b' : latest.maxAbsRate > 10 ? '#ef4444' : latest.maxAbsRate > 5 ? '#f59e0b' : '#10b981'}
          alert={latest.maxAbsRate > 10}
        />
      </section>

      {/* Amplitude Trend */}
      <section style={cardStyle}>
        <SectionTitle>진각 추이</SectionTitle>
        {spanDays < DEFAULTS.min_projection_days && (
          <div style={{
            fontSize: 11, color: '#f59e0b',
            background: 'rgba(245,158,11,0.08)', borderRadius: 6,
            padding: '6px 10px', marginBottom: 14,
            border: '1px solid rgba(245,158,11,0.2)'
          }}>
            ⚠ 측정 기간이 {Math.round(spanDays)}일로 짧습니다. 감쇠 예측은 30일 이상 데이터가 필요합니다.
          </div>
        )}
        <p style={{ fontSize: 11, color: '#475569', marginBottom: 16 }}>
          데이터 포인트에 마우스를 올리면 자세별 레이더 차트를 볼 수 있습니다.
        </p>
        <AmplitudeTrend
          records={sorted}
          criticalThreshold={DEFAULTS.critical_threshold_amplitude}
          baseline={DEFAULTS.baseline_amplitude}
        />
      </section>

      {/* Decay Analysis */}
      <section style={{ ...cardStyle, marginTop: 14 }}>
        <SectionTitle>감쇠율 분석</SectionTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            {
              label: '월간 감쇠율',
              value: decay ? `${decay.toFixed(2)}°` : '—',
              sub:   decay ? '°/월' : '',
              range: spanDays < 7 ? '기간 부족 (7일 이상 필요)' : '정상 0.5–1.2°/월',
              ok: !decay || decay <= 1.2
            },
            {
              label: '이상 징후 임계',
              value: '3.0°',
              sub: '/월',
              range: '초과 시 Yellow Warning',
              ok: true
            },
            {
              label: '임계선 여유',
              value: latest.avgAmplitude != null
                ? `${(latest.avgAmplitude - DEFAULTS.critical_threshold_amplitude).toFixed(0)}°`
                : '—',
              sub: '',
              range: `임계선 ${DEFAULTS.critical_threshold_amplitude}°까지`,
              ok: (latest.avgAmplitude ?? 999) - DEFAULTS.critical_threshold_amplitude > 30
            }
          ].map(({ label, value, sub, range, ok }) => (
            <div key={label} style={{
              flex: 1, minWidth: 140,
              background: '#0d0d1a', borderRadius: 10, padding: '14px 16px',
              border: `1px solid ${ok ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.2)'}`
            }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 6 }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: ok ? '#e2e8f0' : '#f59e0b', letterSpacing: -0.5 }}>{value}</span>
                {sub && <span style={{ fontSize: 12, color: '#475569' }}>{sub}</span>}
              </div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{range}</div>
            </div>
          ))}
        </div>
      </section>

      {/* History */}
      <section style={{ marginTop: 20 }}>
        <SectionTitle>검진 이력 ({records.length}건)</SectionTitle>
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
