import React from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { Line } from 'react-chartjs-2'
import { projectOverhaulDate, DEFAULTS } from '../api/watchApi.js'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler, annotationPlugin
)

function fmt(iso) {
  const d = new Date(iso)
  return `'${d.getFullYear().toString().slice(2)}/${String(d.getMonth()+1).padStart(2,'0')}`
}

function confidenceLabel(r2) {
  if (r2 >= 0.9) return 'high confidence'
  if (r2 >= 0.75) return 'moderate confidence'
  return 'low confidence'
}

export default function AmplitudeTrend({ records, serviceThreshold, baseline }) {
  // Sorted ascending; plot HORIZONTAL amplitude (the projection basis)
  const sorted = [...records].sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at))

  const projection = projectOverhaulDate(sorted)
  const projected  = projection.status === 'projected'

  // Labels + actual data
  const labels    = sorted.map(r => fmt(r.measured_at))
  const ampValues = sorted.map(r => r.horizontalAmplitude)

  // Projection labels (extend to overhaul date) when we have a reliable trend
  let projLabels = labels
  let regressionLine = []
  if (projected) {
    const firstT = new Date(sorted[0].measured_at).getTime()
    const lastT  = projection.date.getTime()
    const STEPS  = 60
    projLabels   = Array.from({ length: STEPS + 1 }, (_, i) => {
      const t = new Date(firstT + (lastT - firstT) * i / STEPS)
      return fmt(t.toISOString())
    })
    regressionLine = Array.from({ length: STEPS + 1 }, (_, i) => {
      const t = firstT + (lastT - firstT) * i / STEPS
      return projection.slope * t + projection.intercept
    })
  }

  // Map actual measurements onto the (possibly extended) label array
  const actualData = new Array(projLabels.length).fill(null)
  sorted.forEach(r => {
    const idx = projLabels.indexOf(fmt(r.measured_at))
    if (idx !== -1) actualData[idx] = r.horizontalAmplitude
  })

  const thresholdData = projLabels.map(() => serviceThreshold)

  // Point colors: flag a measurement whose horizontal amplitude is below service threshold
  const fullPointColors = projLabels.map(lbl => {
    const r = sorted.find(x => fmt(x.measured_at) === lbl)
    if (!r) return 'transparent'
    return r.horizontalAmplitude < serviceThreshold ? '#ef4444' : '#3b82f6'
  })
  const fullPointRadii = projLabels.map(lbl => sorted.some(x => fmt(x.measured_at) === lbl) ? 6 : 0)

  const data = {
    labels: projected ? projLabels : labels,
    datasets: [
      {
        label: 'Amplitude (horizontal °)',
        data: projected ? actualData : ampValues,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.06)',
        pointBackgroundColor: projected ? fullPointColors : ampValues.map(v => v < serviceThreshold ? '#ef4444' : '#3b82f6'),
        pointRadius: projected ? fullPointRadii : ampValues.map(() => 6),
        pointHoverRadius: projected ? fullPointRadii.map(r => r > 0 ? 9 : 0) : ampValues.map(() => 9),
        tension: 0.3,
        fill: false,
        spanGaps: false,
        order: 1
      },
      ...(projected ? [{
        label: `Decay projection (R²=${projection.r2.toFixed(2)})`,
        data: regressionLine,
        borderColor: 'rgba(148,163,184,0.35)',
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0,
        fill: false,
        order: 2
      }] : []),
      {
        label: `Service ${serviceThreshold}°`,
        data: thresholdData,
        borderColor: 'rgba(239,68,68,0.45)',
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
        order: 3
      }
    ]
  }

  const overhaulLabel = projected ? fmt(projection.date.toISOString()) : null

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 18 } },
      tooltip: {
        // Only show the actual measured amplitude — hide the flat service line
        // and the projection line, which carry no per-point meaning.
        filter: item => item.dataset.label.startsWith('Amplitude'),
        callbacks: {
          label: ctx => ctx.parsed.y != null ? `Amplitude: ${ctx.parsed.y}°` : null
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
              content: `⚙ Est. Service ${projection.date.toLocaleDateString('en-US', { year:'numeric', month:'short' })}`,
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
        min: Math.max(180, serviceThreshold - 30),
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

      {/* Projection summary — different message per status */}
      {projected && (
        <div style={{
          marginTop: 10, display: 'flex', gap: 12, alignItems: 'flex-start',
          padding: '10px 14px',
          background: 'rgba(239,68,68,0.07)',
          borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)'
        }}>
          <span style={{ fontSize: 18 }}>⚙</span>
          <div>
            <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
              Estimated service: {projection.date.toLocaleDateString('en-US', { year:'numeric', month:'long' })}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Trend declines ~{projection.declinePerYear.toFixed(0)}°/yr, reaching the {serviceThreshold}° service
              line · linear fit R²={projection.r2.toFixed(2)} ({confidenceLabel(projection.r2)}).
              Rough estimate — amplitude also varies with wind state and temperature.
            </div>
          </div>
        </div>
      )}

      {projection.status === 'stable' && (
        <div style={{
          marginTop: 10, padding: '10px 14px',
          background: 'rgba(16,185,129,0.06)',
          borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)',
          fontSize: 11, color: '#94a3b8'
        }}>
          No significant decay trend — horizontal amplitude is stable
          {projection.declinePerYear != null && ` (≈${projection.declinePerYear.toFixed(0)}°/yr)`}.
          No service date is projected.
        </div>
      )}

      {projection.status === 'insufficient' && (
        <div style={{
          marginTop: 10, padding: '10px 14px',
          background: 'rgba(245,158,11,0.07)',
          borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)',
          fontSize: 11, color: '#94a3b8'
        }}>
          Not enough data to project a service date. A reliable estimate needs at least{' '}
          {DEFAULTS.min_projection_points} measurements spanning {DEFAULTS.min_projection_days}+ days.
        </div>
      )}
    </div>
  )
}
