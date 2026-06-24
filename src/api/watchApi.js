// ── API Config ────────────────────────────────────────────────────────────────
export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://i5dhq7t6fb.execute-api.us-east-1.amazonaws.com/default/timegrapher_api'

// Standard defaults (not in API response — applied client-side)
export const DEFAULTS = {
  critical_threshold_amplitude: 220,
  baseline_amplitude: 290,
}

// Position code labels
export const POSITION_LABELS = {
  DU: 'Dial Up',
  DD: 'Dial Down',
  CU: 'Crown Up',
  CD: 'Crown Down',
  CL: 'Crown Left',
  CR: 'Crown Right',
}

// ── Mock data (matches real API response format) ──────────────────────────────
const MOCK_HISTORY = [
  {
    watch_id: 'DEMO-3235',
    measured_at: '2025-05-02T10:14:00+00:00',
    engineer: '박기사',
    comment: '오버홀 1년 차 점검. 상태 매우 양호함.',
    measurements: {
      DU: { rate: 1.2,  amplitude: 285, beat_error: 0.1 },
      DD: { rate: 0.8,  amplitude: 283, beat_error: 0.1 },
      CU: { rate: -0.5, amplitude: 270, beat_error: 0.2 },
      CD: { rate: -0.8, amplitude: 260, beat_error: 0.2 },
      CL: { rate: 0.3,  amplitude: 275, beat_error: 0.1 },
    }
  },
  {
    watch_id: 'DEMO-3235',
    measured_at: '2025-08-15T14:22:00+00:00',
    engineer: '박기사',
    comment: '자성 유입 의심. 자성제거기 사용 후 재측정 완료.',
    measurements: {
      DU: { rate: 14.2, amplitude: 278, beat_error: 0.1 },
      DD: { rate: 13.8, amplitude: 276, beat_error: 0.2 },
      CU: { rate: 12.1, amplitude: 265, beat_error: 0.3 },
      CD: { rate: 13.5, amplitude: 258, beat_error: 0.3 },
      CL: { rate: 12.9, amplitude: 270, beat_error: 0.2 },
    }
  },
  {
    watch_id: 'DEMO-3235',
    measured_at: '2025-12-10T09:05:00+00:00',
    engineer: '박기사',
    comment: '겨울철 기온 저하로 인한 미세한 오일 점도 변화.',
    measurements: {
      DU: { rate: 2.1,  amplitude: 270, beat_error: 0.1 },
      DD: { rate: 1.9,  amplitude: 268, beat_error: 0.1 },
      CU: { rate: -1.0, amplitude: 255, beat_error: 0.2 },
      CD: { rate: -1.3, amplitude: 248, beat_error: 0.2 },
      CL: { rate: 0.5,  amplitude: 262, beat_error: 0.1 },
    }
  },
  {
    watch_id: 'DEMO-3235',
    measured_at: '2026-06-19T15:30:00+00:00',
    engineer: '김기사',
    comment: '진각이 조금 떨어졌으나 일오차는 여전히 칼 같음.',
    measurements: {
      DU: { rate: 1.0,  amplitude: 255, beat_error: 0.1 },
      DD: { rate: 0.9,  amplitude: 253, beat_error: 0.1 },
      CU: { rate: -1.5, amplitude: 235, beat_error: 0.2 },
      CD: { rate: -1.8, amplitude: 230, beat_error: 0.2 },
      CL: { rate: 0.2,  amplitude: 245, beat_error: 0.1 },
    }
  }
]

// ── Normalize a raw API record into a summary + positions ────────────────────
// Primary position for summary: DU → DD → first available
export function normalize(record) {
  const m = record.measurements || {}
  const primary = m.DU || m.DD || Object.values(m)[0] || {}
  return {
    ...record,
    summary: {
      rate:        primary.rate        ?? null,
      amplitude:   primary.amplitude   ?? null,
      beat_error:  primary.beat_error  ?? null,
    }
  }
}

// ── Linear regression ────────────────────────────────────────────────────────
export function linearRegression(points) {
  const n = points.length
  if (n < 2) return null
  const sumX  = points.reduce((s, p) => s + p.x, 0)
  const sumY  = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null
  const slope     = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

export function projectOverhaulDate(records, threshold) {
  const points = records.map(r => ({
    x: new Date(r.measured_at).getTime(),
    y: r.summary.amplitude
  })).filter(p => p.y != null)
  if (points.length < 2) return null
  const reg = linearRegression(points)
  if (!reg || reg.slope >= 0) return null
  const ms = (threshold - reg.intercept) / reg.slope
  const d = new Date(ms)
  // Only return future dates within 10 years
  const now = Date.now()
  if (ms < now || ms > now + 10 * 365 * 24 * 3600 * 1000) return null
  return d
}

export function monthlyDecayRate(records) {
  const points = records.map(r => ({
    x: new Date(r.measured_at).getTime(),
    y: r.summary.amplitude
  })).filter(p => p.y != null)
  if (points.length < 2) return null
  const reg = linearRegression(points)
  if (!reg) return null
  const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44
  return Math.abs(reg.slope * MS_PER_MONTH)
}

// ── Fetch ────────────────────────────────────────────────────────────────────
export async function fetchWatchHistory(watchId) {
  const isDemo = !watchId || watchId.toUpperCase().startsWith('DEMO')

  if (isDemo) {
    await new Promise(r => setTimeout(r, 500))
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
