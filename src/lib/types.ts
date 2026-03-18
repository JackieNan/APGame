export interface NormalizedEvent {
  source: 'polymarket' | 'manifold'
  sourceId: string
  title: string
  description: string
  category: string
  marketProbability: number
  outcomes: { name: string; probability: number }[]
  timeHorizon: 'short' | 'medium' | 'long'
  rawJson: Record<string, unknown>
}

export interface ResolutionStatus {
  sourceId: string
  resolved: boolean
  outcome?: string
  winningOutcome?: string
}

/**
 * Classify an event's time horizon based on its end date or title keywords.
 * - short: < 7 days from now
 * - medium: 7-30 days from now
 * - long: > 30 days from now
 */
export function guessTimeHorizon(
  endDate?: string,
  title?: string
): 'short' | 'medium' | 'long' {
  if (endDate) {
    const end = new Date(endDate).getTime()
    const now = Date.now()
    const diffDays = (end - now) / (1000 * 60 * 60 * 24)
    if (diffDays < 7) return 'short'
    if (diffDays <= 30) return 'medium'
    return 'long'
  }

  if (title) {
    const lower = title.toLowerCase()
    if (
      lower.includes('today') ||
      lower.includes('tonight') ||
      lower.includes('tomorrow') ||
      lower.includes('this week')
    ) {
      return 'short'
    }
    if (
      lower.includes('this month') ||
      lower.includes('by end of month')
    ) {
      return 'medium'
    }
  }

  return 'long'
}
