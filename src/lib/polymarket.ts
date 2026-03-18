import {
  NormalizedEvent,
  ResolutionStatus,
  guessTimeHorizon,
} from './types'

const GAMMA_API = 'https://gamma-api.polymarket.com'
const CLOB_API = 'https://clob.polymarket.com'
const RATE_LIMIT_DELAY_MS = 34 // ~300 requests per 10s => ~33ms between requests

let lastRequestTime = 0

async function rateLimitedFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS - elapsed))
  }
  lastRequestTime = Date.now()

  const res = await fetch(url, init)
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after') || '2')
    await new Promise((r) => setTimeout(r, retryAfter * 1000))
    return rateLimitedFetch(url, init)
  }
  if (!res.ok) {
    throw new Error(`Polymarket API error: ${res.status} ${res.statusText} for ${url}`)
  }
  return res
}

interface GammaMarket {
  id: string
  question: string
  outcomes: string // JSON-encoded array like '["Yes","No"]'
  outcomePrices: string // JSON-encoded array like '[0.65, 0.35]'
  clobTokenIds?: string // JSON-encoded array
  groupItemTitle?: string
  endDate?: string
  active: boolean
  closed: boolean
  resolvedBy?: string
}

interface GammaEvent {
  id: string
  title: string
  description: string
  category?: string
  endDate?: string
  active: boolean
  closed: boolean
  markets: GammaMarket[]
}

function isBinaryMarket(market: GammaMarket): boolean {
  try {
    const outcomes: string[] = JSON.parse(market.outcomes)
    return (
      outcomes.length === 2 &&
      outcomes.includes('Yes') &&
      outcomes.includes('No')
    )
  } catch {
    return false
  }
}

function normalizeGammaEvent(
  event: GammaEvent,
  market: GammaMarket
): NormalizedEvent {
  let outcomes: { name: string; probability: number }[] = []
  let marketProbability = 0

  try {
    const names: string[] = JSON.parse(market.outcomes)
    const prices: number[] = JSON.parse(market.outcomePrices)
    outcomes = names.map((name, i) => ({
      name,
      probability: prices[i] ?? 0,
    }))
    const yesIdx = names.indexOf('Yes')
    marketProbability = yesIdx >= 0 ? prices[yesIdx] : prices[0] ?? 0
  } catch {
    // leave defaults
  }

  return {
    source: 'polymarket',
    sourceId: market.id,
    title: market.question || event.title,
    description: event.description || '',
    category: event.category || 'unknown',
    marketProbability,
    outcomes,
    timeHorizon: guessTimeHorizon(
      market.endDate || event.endDate,
      market.question || event.title
    ),
    rawJson: event as unknown as Record<string, unknown>,
  }
}

/**
 * Fetch all active binary (Yes/No) events from Polymarket, paginating automatically.
 */
export async function fetchActiveEvents(): Promise<NormalizedEvent[]> {
  const results: NormalizedEvent[] = []
  const limit = 100
  let offset = 0

  while (true) {
    const url = `${GAMMA_API}/events?active=true&limit=${limit}&offset=${offset}`
    const res = await rateLimitedFetch(url)
    const events: GammaEvent[] = await res.json()

    if (!events.length) break

    for (const event of events) {
      for (const market of event.markets) {
        if (isBinaryMarket(market) && market.active && !market.closed) {
          results.push(normalizeGammaEvent(event, market))
        }
      }
    }

    if (events.length < limit) break
    offset += limit
  }

  return results
}

/**
 * Check resolution status for a list of market IDs.
 */
export async function checkResolutions(
  sourceIds: string[]
): Promise<ResolutionStatus[]> {
  const results: ResolutionStatus[] = []

  for (const id of sourceIds) {
    const url = `${GAMMA_API}/events?id=${encodeURIComponent(id)}`
    const res = await rateLimitedFetch(url)
    const events: GammaEvent[] = await res.json()
    const event = events[0]

    if (!event) {
      results.push({ sourceId: id, resolved: false })
      continue
    }

    // Check if any market in the event with this id is resolved
    const market = event.markets.find((m) => m.id === id)
    const resolved = market ? !!market.resolvedBy : event.closed

    let winningOutcome: string | undefined
    if (resolved && market) {
      try {
        const names: string[] = JSON.parse(market.outcomes)
        const prices: number[] = JSON.parse(market.outcomePrices)
        const winIdx = prices.indexOf(Math.max(...prices))
        winningOutcome = names[winIdx]
      } catch {
        // ignore
      }
    }

    results.push({
      sourceId: id,
      resolved,
      outcome: resolved ? 'resolved' : undefined,
      winningOutcome,
    })
  }

  return results
}

export interface PricePoint {
  timestamp: number
  price: number
}

/**
 * Fetch daily price history for a given CLOB token ID.
 */
export async function fetchPriceHistory(
  tokenId: string
): Promise<PricePoint[]> {
  const url = `${CLOB_API}/prices-history?market=${encodeURIComponent(tokenId)}&interval=1d`
  const res = await rateLimitedFetch(url)
  const data: { history: { t: number; p: number }[] } = await res.json()

  return (data.history || []).map((point) => ({
    timestamp: point.t,
    price: point.p,
  }))
}
