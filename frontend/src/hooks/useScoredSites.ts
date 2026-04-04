import { useMemo } from 'react'
import { useFilterStore } from '../store/filterStore'
import { mockSitesWithEnrichment } from '../data/mock-sites'
import { applyHardFilters } from '../lib/filters'
import { computeScoreBreakdown } from '../lib/scoring'
import type { ScoredSite } from '../types'

export function useScoredSites() {
  const { hardFilters, techWeights, commWeights, techCommBalance, sortBy, sortDir, page, limit } =
    useFilterStore()

  const { scored, total } = useMemo(() => {
    // Filter
    const filtered = mockSitesWithEnrichment.filter((s) =>
      applyHardFilters(s.enrichment, hardFilters),
    )

    // Score
    const scored: ScoredSite[] = filtered.map((s) => {
      const breakdown = computeScoreBreakdown(s.enrichment, techWeights, commWeights, techCommBalance)
      return {
        ...s.site,
        enrichment: s.enrichment,
        technical_score: breakdown.technical.total,
        commercial_score: breakdown.commercial.total,
        composite_score: breakdown.composite,
        rank: 0,
        score_breakdown: breakdown,
      }
    })

    // Sort
    scored.sort((a, b) => {
      let aVal: number, bVal: number
      switch (sortBy) {
        case 'technical_score':
          aVal = a.technical_score; bVal = b.technical_score; break
        case 'commercial_score':
          aVal = a.commercial_score; bVal = b.commercial_score; break
        case 'developable_area_acres':
          aVal = a.enrichment.developable_area_acres; bVal = b.enrichment.developable_area_acres; break
        case 'nearest_substation_dist_mi':
          aVal = a.enrichment.nearest_substation_dist_mi; bVal = b.enrichment.nearest_substation_dist_mi; break
        default:
          aVal = a.composite_score; bVal = b.composite_score
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })

    // Assign ranks
    scored.forEach((s, i) => { s.rank = i + 1 })

    return { scored, total: filtered.length }
  }, [hardFilters, techWeights, commWeights, techCommBalance, sortBy, sortDir])

  // Paginate
  const pages = Math.ceil(total / limit)
  const paginated = scored.slice((page - 1) * limit, page * limit)

  return { sites: paginated, allSites: scored, total, page, pages }
}
