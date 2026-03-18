import {
  NormalizedEvent,
  ResolutionStatus,
  guessTimeHorizon,
} from './types'

const BASE_URL = 'https://api.manifold.markets/v0'

interface ManifoldMarket {
  id: string
  question: string
  description?: string | { content?: string }
  textDescription?: string
  tags?: string[]
  groupSlugs?: string[]
  probability?: number
  closeTime?: number
  isResolved: boolean
  resolution?: string
  mechanism: string
  outcomeType: string
  volume24Hours?: number
  [key: string]: unknown
}

function extractDescription(market: ManifoldMarket): string {
  if (market.textDescription) return market.textDescription
  if (typeof market.description === 'string') return market.description
  return ''
}

function extractCategory(market: ManifoldMarket): string {
  if (market.groupSlugs?.length) return market.groupSlugs[0]
  if (market.tags?.length) return market.tags[0]
  return 'unknown'
}

function normalizeManifoldMarket(market: ManifoldMarket): NormalizedEvent {
  const prob = market.probability ?? 0
  const endDateStr = market.closeTime
    ? new Date(market.closeTime).toISOString()
    : undefined

  return {
    source: 'manifold',
    sourceId: market.id,
    title: market.question,
    description: extractDescription(market),
    category: extractCategory(market),
    marketProbability: prob,
    outcomes: [
      { name: 'Yes', probability: prob },
      { name: 'No', probability: 1 - prob },
    ],
    timeHorizon: guessTimeHorizon(endDateStr, market.question),
    rawJson: market as unknown as Record<string, unknown>,
  }
}

/**
 * Fetch active binary markets from Manifold.
 * Prioritize events closing soon (within 3 months) for better game feedback.
 */
export async function fetchActiveEvents(): Promise<NormalizedEvent[]> {
  // Fetch multiple batches to get a good mix of short/medium/long term
  const threeMonthsFromNow = Date.now() + 90 * 24 * 60 * 60 * 1000

  const urls = [
    // Sort by close time (soonest first) — catches short-term events
    `${BASE_URL}/search-markets?filter=open&sort=close-date&limit=50`,
    // Sort by activity — catches popular/interesting events
    `${BASE_URL}/search-markets?filter=open&sort=liquidity&limit=50`,
  ]

  const allMarkets = new Map<string, ManifoldMarket>()

  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const markets: ManifoldMarket[] = await res.json()
      for (const m of markets) {
        if (m.outcomeType === 'BINARY' && !m.isResolved) {
          allMarkets.set(m.id, m)
        }
      }
    } catch {
      continue
    }
  }

  // Filter: only events closing within 3 months, exclude very low probability extremes
  const filtered = [...allMarkets.values()].filter((m) => {
    if (!m.closeTime) return false
    if (m.closeTime > threeMonthsFromNow) return false
    // Exclude markets with no real action (prob very close to 0 or 1)
    const prob = m.probability ?? 0.5
    if (prob < 0.03 || prob > 0.97) return false
    return true
  })

  // Sort by close time ascending (soonest first)
  filtered.sort((a, b) => (a.closeTime ?? 0) - (b.closeTime ?? 0))

  return filtered.map(normalizeManifoldMarket)
}

/**
 * Check resolution status for a list of Manifold market IDs.
 */
export async function checkResolutions(
  sourceIds: string[]
): Promise<ResolutionStatus[]> {
  const results: ResolutionStatus[] = []

  for (const id of sourceIds) {
    const url = `${BASE_URL}/market/${encodeURIComponent(id)}`
    const res = await fetch(url)

    if (!res.ok) {
      results.push({ sourceId: id, resolved: false })
      continue
    }

    const market: ManifoldMarket = await res.json()

    results.push({
      sourceId: id,
      resolved: market.isResolved,
      outcome: market.resolution,
      winningOutcome: market.resolution === 'YES'
        ? 'Yes'
        : market.resolution === 'NO'
          ? 'No'
          : market.resolution,
    })
  }

  return results
}
