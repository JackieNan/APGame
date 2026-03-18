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
 * Fetch active binary markets from Manifold, sorted by liquidity.
 */
export async function fetchActiveEvents(): Promise<NormalizedEvent[]> {
  const url = `${BASE_URL}/search-markets?filter=open&sort=liquidity&limit=50`
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Manifold API error: ${res.status} ${res.statusText}`)
  }

  const markets: ManifoldMarket[] = await res.json()

  return markets
    .filter((m) => m.outcomeType === 'BINARY' && !m.isResolved)
    .map(normalizeManifoldMarket)
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
