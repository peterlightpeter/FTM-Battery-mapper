import type { SiteEnrichment, TechnicalWeights, CommercialWeights, ScoreBreakdown } from '../types'

function scoreArea(acres: number): number {
  if (acres >= 5) return 100
  if (acres >= 2) return 75
  if (acres >= 1) return 50
  if (acres >= 0.5) return 25
  return 0
}

function scoreSubstation(distMi: number): number {
  if (distMi < 0.25) return 100
  if (distMi < 0.5) return 80
  if (distMi < 1.0) return 60
  if (distMi < 2.0) return 30
  return 0
}

function scoreHosting(tier: string): number {
  switch (tier) {
    case 'High': return 100
    case 'Medium': return 60
    case 'Unknown': return 40
    case 'Low': return 20
    default: return 40
  }
}

function scoreFlood(zone: string): number {
  if (zone.startsWith('X')) return 100
  if (zone === 'A') return 50
  if (['AE', 'AO', 'VE'].includes(zone)) return 0
  return 50
}

function scoreWetland(within500ft: boolean | null): number {
  if (within500ft === false) return 100
  if (within500ft === true) return 25
  return 70
}

function scoreZoning(compatible: string): number {
  switch (compatible) {
    case 'Yes': return 100
    case 'Review': return 50
    case 'No': return 0
    default: return 50
  }
}

function normalize(weights: Record<string, number>): Record<string, number> {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0)
  if (sum === 0) return weights
  const result: Record<string, number> = {}
  for (const [k, v] of Object.entries(weights)) {
    result[k] = v / sum
  }
  return result
}

export function scoreTechnical(e: SiteEnrichment, rawWeights: TechnicalWeights) {
  const w = normalize(rawWeights as unknown as Record<string, number>)

  const components = {
    area: scoreArea(e.developable_area_acres),
    substation: scoreSubstation(e.nearest_substation_dist_mi),
    hosting: scoreHosting(e.hosting_capacity_tier),
    flood: scoreFlood(e.fema_flood_zone),
    wetland: scoreWetland(e.wetland_within_500ft),
    zoning: scoreZoning(e.zoning_compatible),
  }

  const total = Math.round(
    (components.area * (w.area ?? 0) +
      components.substation * (w.substation ?? 0) +
      components.hosting * (w.hosting ?? 0) +
      components.flood * (w.flood ?? 0) +
      components.wetland * (w.wetland ?? 0) +
      components.zoning * (w.zoning ?? 0)) * 10
  ) / 10

  return { total, components }
}

export function scoreCommercial(e: SiteEnrichment, rawWeights: CommercialWeights) {
  const w = normalize(rawWeights as unknown as Record<string, number>)

  const components = {
    ira: e.ira_energy_community ? 100 : 0,
    miso: e.miso_lrz === '4' ? 80 : 40,
    ceja: e.ceja_ej_community ? 100 : 0,
    brownfield: e.epa_brownfield ? 100 : 0,
    zoning: scoreZoning(e.zoning_compatible),
    enterprise: e.il_enterprise_zone ? 100 : 0,
  }

  const total = Math.round(
    (components.ira * (w.ira ?? 0) +
      components.miso * (w.miso ?? 0) +
      components.ceja * (w.ceja ?? 0) +
      components.brownfield * (w.brownfield ?? 0) +
      components.zoning * (w.zoning ?? 0) +
      components.enterprise * (w.enterprise ?? 0)) * 10
  ) / 10

  return { total, components }
}

export function computeScoreBreakdown(
  e: SiteEnrichment,
  techWeights: TechnicalWeights,
  commWeights: CommercialWeights,
  techCommBalance: number,
): ScoreBreakdown {
  const technical = scoreTechnical(e, techWeights)
  const commercial = scoreCommercial(e, commWeights)
  const composite = Math.round(
    (technical.total * techCommBalance + commercial.total * (1 - techCommBalance)) * 10
  ) / 10

  return { technical, commercial, composite }
}
