import React, { useRef, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { Line } from 'react-chartjs-2'
import { linearRegression, projectOverhaulDate } from '../api/watchApi.js'
import RadarPopup from './RadarPopup.jsx'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler, annotationPlugin
)

function fmt(iso) {
  const d = new Date(iso)
  return `'${d.getFullYear().toString().slice(2)}/${String(d.getMonth()+1).padStart(2,'0')}`
}

export default function AmplitudeTrend({ records, criticalThreshold, baseline }) {
  const [popup, setPopup] = useState(null)

  // Sorted ascending
  const sorted = [...records].sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at))

  const regPoints = sorted.map(r => ({
    x: new Date(r.measured_at).getTime(),
    y: r.summary.amplitude
  })).filter(p => p.y != null)

  const overhaulDate = projectOverhaulDate(sorted, criticalThreshold)
  const reg = linearRegression(regPoints)

  // Labels + actual data
  const labels    = sorted.map(r => fmt(r.measured_at))
  const ampValues = sorted.map(r => r.summary.amplitude)

  // Projection labels (extend to overhaul date)
  let projLabels = labels
  let regressionLine = []
  if (reg && overhaulDate) {
    const firstT = new Date(sorted[0].measured_at).getTime()
    const lastT  = overhaulDate.getTime()
    const STEPS  = 60
    projLabels   = Array.from({ length: STEPS + 1 }, (_, i) => {
      const t = new Date(firstT + (lastT - firstT) * i / STEPS)
      return fmt(t.toISOString())
    })
    regressionLine = Array.from({ length: STEPS + 1 }, (_, i) => {
      const t = firstT + (lastT - firstT) * i / STEPS
      return reg.slope * t + reg.intercept
    })
  }

  // Map actual measurements onto projection label array
  const actualData = new Array(projLabels.length).fill(null)
  sorted.forEach(r => {
    const lbl = fmt(r.measured_at)
    const idx = projLabels.indexOf(lbl)
    if (idx !== -1) actualData[idx] = r.summary.amplitude
  })

  const thresholdData = projLabels.map(() => criticalThreshold)

  // Anomaly detection: rate > 10 s/d
  const pointColors = sorted.map(r => Math.abs(r.summary.rate) > 10 ? '#ef4444' : '#3b82f6')
  const pointRadii  = sorted.map(() => 6)

  // Build pointColor array for projection labels
  const fullPointColors = projLabels.map((lbl, i) => {
    const sIdx = sorted.findIndex(r => fmt(r.measured_at) === lbl)
    return sIdx !== -1 ? pointColors[sIdx] : 'transparent'
  })
  const fullPointRadii = projLabels.map(lbl => {
    const sIdx = sorted.findIndex(r => fmt(r.measured_at) === lbl)
    return sIdx !== -1 ? 6 : 0
  })

  const data = {
    labels: reg && overhaulDate ? projLabels : labels,
    datasets: [
      {
        label: '진각 (°)',
        data: reg && overhaulDate ? actualData : ampValues,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.06)',
        pointBackgroundColor: reg && overhaulDate ? fullPointColors : pointColors,
        pointRadius: reg && overhaulDate ? fullPointRadii : pointRadii,
        pointHoverRadius: reg && overhaulDate ? fullPointRadii.map(r => r > 0 ? 9 : 0) : pointRadii.map(() => 9),
        tension: 0.3,
        fill: false,
        spanGaps: false,
        order: 1
      },
      ...(reg && overhaulDate ? [{
        label: '감쇠 예측선',
        data: regressionLine,
        borderColor: 'rgba(148,163,184,0.35)',
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0,
        fill: false,
        order: 2
      }] : []),
      {
        label: `임계선 ${criticalThreshold}°`,
        data: thresholdData,
        borderColor: 'rgba(239,68,68,0.45)',
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
        order: 3
      }
    ]
  }

  const overhaulLabel = overhaulDate ? fmt(overhaulDate.toISOString()) : null

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 18 } },
      tooltip: {
        enabled: false,
        external: ({ chart, tooltip }) => {
          if (tooltip.opacity === 0) { setPopup(null); return }
          const lbl = chart.data.labels[tooltip.dataPoints?.[0]?.dataIndex]
          const rec = sorted.find(r => fmt(r.measured_at) === lbl)
          if (!rec) { setPopup(null); return }
          const rect = chart.canvas.getBoundingClientRect()
          setPopup({ x: rect.left + tooltip.caretX, y: rect.top + tooltip.caretY, record: rec })
        }
      },
      annotation: overhaulLabel ? {
        annotations: {
          overhaulLine: {
            type: 'line',
            xMin: overhaulLabel,
            xMax: overhaulLabel,
            borderColor: 'rgba(239,68,68,0.5)',
            borderWidth: 1,
            borderDash: [4, 4],
            label: {
              display: true,
              content: `⚙ 예상 오버홀 ${overhaulDate.toLocaleDateString('ko-KR', { year:'numeric', month:'short' })}`,
              color: '#ef4444',
              backgroundColor: 'rgba(239,68,68,0.1)',
              borderRadius: 4,
              font: { size: 10 },
              position: 'start'
            }
          }
        }
      } : { annotations: {} }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 10 },
        grid: { color: 'rgba(255,255,255,0.04)' }
      },
      y: {
        min: Math.max(180, criticalThreshold - 30),
        max: baseline + 20,
        ticks: { color: '#64748b', font: { size: 10 }, callback: v => `${v}°` },
        grid: { color: 'rgba(255,255,255,0.04)' }
      }
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ height: 280 }}>
        <Line data={data} options={options} />
      </div>

      {overhaulDate && (
        <div style={{
          marginTop: 10, display: 'flex', gap: 12, alignItems: 'center',
          padding: '10px 14px',
          background: 'rgba(239,68,68,0.07)',
          borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)'
        }}>
          <span style={{ fontSize: 18 }}>⚙</span>
          <div>
            <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
              예상 오버홀 시점: {overhaulDate.toLocaleDateString('ko-KR', { year:'numeric', month:'long' })}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              현재 감쇠 기울기 기준 진각 {criticalThreshold}° 임계선 도달 예상
            </div>
          </div>
        </div>
      )}

      {popup && (
        <RadarPopup
          record={popup.record}
          x={popup.x}
          y={popup.y}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}
