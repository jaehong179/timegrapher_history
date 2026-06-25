export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://i5dhq7t6fb.execute-api.us-east-1.amazonaws.com/default/timegrapher_api'

// ── Configuration ─────────────────────────────────────────────────────────────
// Thresholds are based on common mechanical-watch timegrapher practice and the
// COSC chronometer standard. See HEALTH_BANDS comments for the rationale.
export const DEFAULTS = {
  baseline_amplitude: 290,          // typical healthy full-wind horizontal amplitude
  critical_threshold_amplitude: 200, // service-recommended amplitude (chart line + projection target)

  // Overhaul projection gating
  min_projection_points: 3,         // need at least 3 measurements for a trend
  min_projection_days: 90,          // ...spanning at least ~3 months so the trend beats noise
  min_projection_r2: 0.6,           // regression must explain >=60% of variance
  min_decline_deg_per_year: 10,     // require a meaningful decline before projecting
}

export const POSITION_LABELS = {
  DU: 'Dial Up',
  DD: 'Dial Down',
  CU: 'Crown Up',
  CD: 'Crown Down',
  CL: 'Crown Left',
  CR: 'Crown Right',
}

// ── Health bands (the documented basis for each grade) ────────────────────────
// Each indicator is scored 4=Excellent, 3=Good, 2=Fair, 1=Warning. The overall
// grade is the WORST of the indicators, because mechanical health is limited by
// its weakest dimension. Accuracy (mean daily rate) is deliberately NOT part of
// the health grade — it reflects regulation, which is freely adjustable and not
// a sign of condition.
//
// Amplitude (horizontal DU/DD, assumed near full wind), degrees:
//   >=270 healthy reference · 230-270 normal · 200-230 caution (service nearing)
//   <200 low (service recommended). Basis: full-wind horizontal amplitude for a
//   serviced movement is typically ~270-315 deg; below ~200 deg is a common
//   service indicator.
// Positional delta (max-min daily rate across the six positions), s/d:
//   <=8 chronometer-grade · <=15 good · <=25 fair · >25 poor. Basis: tight
//   positional consistency reflects good poise/escapement condition; the COSC
//   standard limits the mean positional variation to a few s/d.
// Beat error (max across positions), ms:
//   <=0.4 excellent · <=0.7 good · <=1.0 fair · >1.0 poor. Basis: <0.5 ms is the
//   common "good" target; >1.0 ms indicates escapement/hairspring misalignment.
function amplitudeLevel(a) {
  if (a == null) return null
  if (a >= 270) return 4
  if (a >= 230) return 3
  if (a >= DEFAULTS.critical_threshold_amplitude) return 2
  return 1
}
function deltaLevel(d) {
  if (d == null) return null
  if (d <= 8)  return 4
  if (d <= 15) return 3
  if (d <= 25) return 2
  return 1
}
function beatLevel(b) {
  if (b == null) return null
  if (b <= 0.4) return 4
  if (b <= 0.7) return 3
  if (b <= 1.0) return 2
  return 1
}

const LEVEL_TO_GRADE = { 4: 'EXCELLENT', 3: 'GOOD', 2: 'FAIR', 1: 'WARNING' }
const LEVEL_TO_BAND  = { 4: 'excellent', 3: 'good', 2: 'caution', 1: 'below threshold' }

// computeHealth: derive grade + the limiting (weakest) indicator from a record.
export function computeHealth(record) {
  if (!record) return { grade: 'GOOD', factors: [], limiting: null }

  const factors = [
    { key: 'amplitude', label: 'Amplitude (horizontal)', value: record.horizontalAmplitude, unit: '°',   level: amplitudeLevel(record.horizontalAmplitude) },
    { key: 'delta',     label: 'Positional delta',        value: record.positionalDelta,     unit: ' s/d', level: deltaLevel(record.positionalDelta) },
    { key: 'beat',      label: 'Beat error',              value: record.maxBeatError,        unit: ' ms',  level: beatLevel(record.maxBeatError) },
  ].filter(f => f.level != null)

  if (factors.length === 0) return { grade: 'GOOD', factors: [], limiting: null }

  const limiting = factors.reduce((min, f) => (f.level < min.level ? f : min), factors[0])
  return {
    grade: LEVEL_TO_GRADE[limiting.level],
    band:  LEVEL_TO_BAND[limiting.level],
    limiting,
    factors,
  }
}

const round1 = n => parseFloat(n.toFixed(1))
const round2 = n => parseFloat(n.toFixed(2))
const mean   = arr => arr.reduce((s, v) => s + v, 0) / arr.length

// ── Mock (DEMO only) ──────────────────────────────────────────────────────────
const MOCK_HISTORY = [
  {
    watch_id: 'DEMO-3235',
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
    watch_id: 'DEMO-3235',
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
    watch_id: 'DEMO-3235',
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
    watch_id: 'DEMO-3235',
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

// ── normalize: derive headline + condition indicators ─────────────────────────
export function normalize(record) {
  const m   = record.measurements || {}
  const pos = Object.values(m)
  if (pos.length === 0) {
    return {
      ...record,
      summary: { rate: null, amplitude: null, beat_error: null },
      horizontalAmplitude: null, avgAmplitude: null,
      positionalDelta: null, maxAbsRate: 0, maxBeatError: null,
    }
  }

  // Mean daily rate reference: prefer Dial Up, then Dial Down, else first
  const primary = m.DU || m.DD || pos[0]

  // Amplitude: headline uses HORIZONTAL (DU/DD) at assumed full wind — the
  // conventional reference. Fall back to all-position avg if no horizontal read.
  const horiz = [m.DU, m.DD].filter(Boolean).map(p => p.amplitude).filter(v => v != null)
  const avgAmplitude        = mean(pos.map(p => p.amplitude ?? 0))
  const horizontalAmplitude = horiz.length ? mean(horiz) : avgAmplitude

  // Positional delta = spread of rate across positions (max - min)
  const rates = pos.map(p => p.rate ?? 0)
  const positionalDelta = Math.max(...rates) - Math.min(...rates)
  const maxAbsRate = Math.max(...rates.map(Math.abs))

  // Worst beat error across positions
  const maxBeatError = Math.max(...pos.map(p => p.beat_error ?? 0))

  return {
    ...record,
    summary: {
      rate:       primary.rate ?? null,
      amplitude:  round1(horizontalAmplitude),
      beat_error: round2(maxBeatError),
    },
    horizontalAmplitude: round1(horizontalAmplitude),
    avgAmplitude:        round1(avgAmplitude),
    positionalDelta:     round1(positionalDelta),
    maxAbsRate:          round1(maxAbsRate),
    maxBeatError:        round2(maxBeatError),
  }
}

// ── Linear regression (with R² goodness-of-fit) ───────────────────────────────
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

  // R²
  const meanY = sumY / n
  let ssTot = 0, ssRes = 0
  for (const p of points) {
    const pred = slope * p.x + intercept
    ssTot += (p.y - meanY) ** 2
    ssRes += (p.y - pred)  ** 2
  }
  const r2 = ssTot < 1e-10 ? 1 : 1 - ssRes / ssTot
  return { slope, intercept, r2 }
}

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25

// ── Overhaul projection ───────────────────────────────────────────────────────
// Returns a status object instead of a bare date, so the UI can distinguish
// "not enough data", "stable / no meaningful trend", and an actual projection
// with its confidence. Basis: extrapolate the horizontal-amplitude decline to
// the service threshold, but only when the trend is statistically reliable.
export function projectOverhaulDate(records) {
  const pts = records
    .map(r => ({ x: new Date(r.measured_at).getTime(), y: r.horizontalAmplitude }))
    .filter(p => p.y != null)
    .sort((a, b) => a.x - b.x)

  const spanDays = pts.length
    ? (pts[pts.length - 1].x - pts[0].x) / (1000 * 60 * 60 * 24)
    : 0

  if (pts.length < DEFAULTS.min_projection_points || spanDays < DEFAULTS.min_projection_days) {
    return { status: 'insufficient', points: pts.length, spanDays }
  }

  const reg = linearRegression(pts)
  if (!reg) return { status: 'insufficient', points: pts.length, spanDays }

  const declinePerYear = -reg.slope * MS_PER_YEAR // positive when amplitude falls

  // No reliable decline → don't pretend to project
  if (reg.slope >= 0 || reg.r2 < DEFAULTS.min_projection_r2 || declinePerYear < DEFAULTS.min_decline_deg_per_year) {
    return { status: 'stable', r2: reg.r2, declinePerYear }
  }

  const target = DEFAULTS.critical_threshold_amplitude
  const ms  = (target - reg.intercept) / reg.slope
  const now = Date.now()
  if (ms < now || ms > now + 10 * MS_PER_YEAR) {
    return { status: 'stable', r2: reg.r2, declinePerYear }
  }

  return {
    status: 'projected',
    date: new Date(ms),
    target,
    r2: reg.r2,
    declinePerYear,
    slope: reg.slope,
    intercept: reg.intercept,
  }
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
