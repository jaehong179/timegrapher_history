import React from 'react'

const GRADE_CONFIG = {
  EXCELLENT: { label: '최상', color: '#10b981', bg: 'rgba(16,185,129,0.12)', desc: '모든 지표가 기준 범위 내에 있습니다.' },
  HEALTHY:   { label: '정상', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', desc: '자연적 열화 범위 내 정상 감쇠 중입니다.' },
  GOOD:      { label: '양호', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', desc: '진각 감소 추이를 주시하세요.' },
  WARNING:   { label: '주의', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  desc: '내부 정밀 검사 권장.' },
}

export default function HealthGrade({ grade, watchId, recordCount, lastMeasured, lastEngineer }) {
  const cfg = GRADE_CONFIG[grade] || GRADE_CONFIG.HEALTHY
  const lastDate = lastMeasured
    ? new Date(lastMeasured).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' })
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
        width: 84, height: 84, borderRadius: '50%',
        background: cfg.bg,
        border: `2px solid ${cfg.color}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: `0 0 20px ${cfg.color}35`
      }}>
        <span style={{ fontSize: 9, color: cfg.color, fontWeight: 600, letterSpacing: 1, opacity: 0.7 }}>GRADE</span>
        <span style={{ fontSize: 20, color: cfg.color, fontWeight: 700, lineHeight: 1.3 }}>{cfg.label}</span>
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
          최근 측정: {lastDate} &nbsp;·&nbsp; 총 {recordCount}건
          {lastEngineer && <span> &nbsp;·&nbsp; 담당: {lastEngineer}</span>}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: cfg.bg, borderRadius: 8, padding: '5px 12px',
          fontSize: 12, color: cfg.color, fontWeight: 500
        }}>
          {cfg.desc}
        </div>
      </div>
    </div>
  )
}
