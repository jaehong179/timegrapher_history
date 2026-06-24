import React, { useEffect, useRef } from 'react'
import {
  Chart as ChartJS, RadialLinearScale, PointElement,
  LineElement, Filler, Tooltip
} from 'chart.js'
import { Radar } from 'react-chartjs-2'
import { POSITION_LABELS } from '../api/watchApi.js'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

export default function RadarPopup({ record, x, y, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const m = record?.measurements
  if (!m || Object.keys(m).length === 0) return null

  const keys   = Object.keys(m)
  const labels = keys.map(k => POSITION_LABELS[k] || k)
  const amps   = keys.map(k => m[k].amplitude)
  const min    = Math.min(...amps)
  const max    = Math.max(...amps)
  const spread = max - min

  const date = new Date(record.measured_at).toLocaleDateString('ko-KR')

  const radarData = {
    labels,
    datasets: [{
      label: '진각 (°)',
      data: amps,
      backgroundColor: 'rgba(59,130,246,0.15)',
      borderColor: '#3b82f6',
      pointBackgroundColor: '#3b82f6',
      pointRadius: 3
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      r: {
        min: min - 20,
        max: max + 20,
        ticks: { display: false },
        grid: { color: 'rgba(255,255,255,0.08)' },
        pointLabels: { color: '#94a3b8', font: { size: 9 } }
      }
    }
  }

  const popupW = 230, popupH = 310
  const left = Math.min(x + 14, window.innerWidth  - popupW - 12)
  const top  = Math.min(y - 20,  window.innerHeight - popupH - 12)

  return (
    <div ref={ref} style={{
      position: 'fixed', left, top, zIndex: 999,
      width: popupW,
      background: '#1a1a2e',
      border: '1px solid rgba(59,130,246,0.35)',
      borderRadius: 12,
      padding: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      pointerEvents: 'auto'
    }}>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>{date} 자세별 진각</div>
      <div style={{ height: 130, marginBottom: 10 }}>
        <Radar data={radarData} options={options} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {keys.map(k => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: '#64748b' }}>{k} <span style={{ color: '#475569', fontSize: 10 }}>({POSITION_LABELS[k]})</span></span>
            <span style={{ color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
              {m[k].amplitude}° &nbsp;
              <span style={{ color: Math.abs(m[k].rate) > 5 ? '#ef4444' : '#94a3b8' }}>
                {m[k].rate > 0 ? '+' : ''}{m[k].rate} s/d
              </span>
            </span>
          </div>
        ))}
        <div style={{
          marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.07)',
          fontSize: 10, color: spread > 20 ? '#f59e0b' : '#64748b'
        }}>
          자세별 편차 {spread.toFixed(1)}° {spread > 20 ? '⚠ 주의' : '✓ 정상'}
        </div>
      </div>
    </div>
  )
}
