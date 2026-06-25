export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://i5dhq7t6fb.execute-api.us-east-1.amazonaws.com/default/timegrapher_api'

export const DEFAULTS = {
  critical_threshold_amplitude: 220,
  baseline_amplitude: 290,
  min_projection_days: 30,   // below this span, no overhaul projection
}

export const POSITION_LABELS = {
  DU: 'Dial Up',
  DD: 'Dial Down',
  CU: 'Crown Up',
  CD: 'Crown Down',
  CL: 'Crown Left',
  CR: 'Crown Right',
}

// ── Mock (DEMO only) ──────────────────────────────────────────────────────────
const MOCK_HISTORY = [
  {
    watch_id: 'DEMO-3235', comment: 'One-year post-overhaul check.',
    measured_at: '2025-05-02T10:14:00+00:00',
    measurements: {
      DU: { rate: 1.2,  amplitude: 285, beat_error: 0.1 },
      DD: { rate: 0.8,  amplitude: 283, beat_error: 0.1 },
      CU: { rate: -0.5, amplitude: 270, beat_error: 0.2 },
      CD: { rate: -0.8, amplitude: 260, beat_error: 0.2 },
      CL: { rate: 0.3,  amplitude: 275, beat_error: 0.1 },
      CR: { rate: 0.1,  amplitude: 278, beat_error: 0.1 },
    }
  },
  {
    watch_id: 'DEMO-3235', comment: 'Suspected magnetization. Re-measured after demagnetizing.',
    measured_at: '2025-08-15T14:22:00+00:00',
    measurements: {
      DU: { rate: 14.2, amplitude: 278, beat_error: 0.1 },
      DD: { rate: 13.8, amplitude: 276, beat_error: 0.2 },
      CU: { rate: 12.1, amplitude: 265, beat_error: 0.3 },
      CD: { rate: 13.5, amplitude: 258, beat_error: 0.3 },
      CL: { rate: 12.9, amplitude: 270, beat_error: 0.2 },
      CR: { rate: 11.5, amplitude: 272, beat_error: 0.2 },
    }
  },
  {
    watch_id: 'DEMO-3235', comment: 'Oil viscosity shift due to lower winter temperatures.',
    measured_at: '2025-12-10T09:05:00+00:00',
    measurements: {
      DU: { rate: 2.1,  amplitude: 270, beat_error: 0.1 },
      DD: { rate: 1.9,  amplitude: 268, beat_error: 0.1 },
      CU: { rate: -1.0, amplitude: 255, beat_error: 0.2 },
      CD: { rate: -1.3, amplitude: 248, beat_error: 0.2 },
      CL: { rate: 0.5,  amplitude: 262, beat_error: 0.1 },
      CR: { rate: 0.8,  amplitude: 264, beat_error: 0.1 },
    }
  },
  {
    watch_id: 'DEMO-3235', comment: 'Amplitude dropped slightly but daily rate remains good.',
    measured_at: '2026-06-19T15:30:00+00:00',
    measurements: {
      DU: { rate: 1.0,  amplitude: 255, beat_error: 0.1 },
      DD: { rate: 0.9,  amplitude: 253, beat_error: 0.1 },
      CU: { rate: -1.5, amplitude: 235, beat_error: 0.2 },
      CD: { rate: -1.8, amplitude: 230, beat_error: 0.2 },
      CL: { rate: 0.2,  amplitude: 245, beat_error: 0.1 },
      CR: { rate: 0.4,  amplitude: 248, beat_error: 0.1 },
    }
  }
]

// ── normalize: add summary values + anomaly flags ─────────────────────────────
export function normalize(record) {
  const m   = record.measurements || {}
  const pos = Object.values(m)
  if (pos.length === 0) return { ...record, summary: { rate: null, amplitude: null, beat_error: null }, maxAbsRate: 0, avgAmplitude: null }

  // Prefer DU, then DD, else first
  const primary = m.DU || m.DD || pos[0]

  // Average amplitude across positions
  const avgAmplitude = pos.reduce((s, p) => s + (p.amplitude ?? 0), 0) / pos.length

  // Max absolute daily rate across positions (for anomaly detection)
  const maxAbsRate = pos.reduce((max, p) => Math.max(max, Math.abs(p.rate ?? 0)), 0)

  // Max beat error across positions
  const maxBeatError = pos.reduce((max, p) => Math.max(max, p.beat_error ?? 0), 0)

  return {
    ...record,
    summary: {
      rate:       primary.rate       ?? null,
      amplitude:  parseFloat(avgAmplitude.toFixed(1)),
      beat_error: parseFloat(maxBeatError.toFixed(2)),
    },
    maxAbsRate,
    avgAmplitude: parseFloat(avgAmplitude.toFixed(1)),
  }
}

// ── Linear regression ─────────────────────────────────────────────────────────
export function linearRegression(points) {
  const n = points.length
  if (n < 2) return null
  const sumX  = points.reduce((s, p) => s + p.x, 0)
  const sumY  = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (Math.abs(denom) < 1e-10) return null
  const slope     = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

export function projectOverhaulDate(records, threshold) {
  if (records.length < 2) return null

  // Require at least 30 days of data to project
  const times = records.map(r => new Date(r.measured_at).getTime())
  const spanDays = (Math.max(...times) - Math.min(...times)) / (1000 * 60 * 60 * 24)
  if (spanDays < DEFAULTS.min_projection_days) return null

  const points = records.map(r => ({
    x: new Date(r.measured_at).getTime(),
    y: r.avgAmplitude ?? r.summary?.amplitude
  })).filter(p => p.y != null)

  const reg = linearRegression(points)
  if (!reg || reg.slope >= 0) return null
  const ms = (threshold - reg.intercept) / reg.slope
  const now = Date.now()
  if (ms < now || ms > now + 10 * 365.25 * 24 * 3600 * 1000) return null
  return new Date(ms)
}

export function monthlyDecayRate(records) {
  if (records.length < 2) return null
  const times = records.map(r => new Date(r.measured_at).getTime())
  const spanDays = (Math.max(...times) - Math.min(...times)) / (1000 * 60 * 60 * 24)
  if (spanDays < 7) return null   // not meaningful with less than 7 days of data

  const points = records.map(r => ({
    x: new Date(r.measured_at).getTime(),
    y: r.avgAmplitude ?? r.summary?.amplitude
  })).filter(p => p.y != null)

  const reg = linearRegression(points)
  if (!reg) return null
  const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44
  return Math.abs(reg.slope * MS_PER_MONTH)
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
export async function fetchWatchHistory(watchId) {
  const isDemo = !watchId || watchId.toUpperCase().startsWith('DEMO')
  if (isDemo) {
    await new Promise(r => setTimeout(r, 400))
    return MOCK_HISTORY.map(normalize)
  }
  const url = `${BASE_URL}?watch_id=${encodeURIComponent(watchId)}`
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('Unexpected API response format')
  return data.map(normalize)
}
