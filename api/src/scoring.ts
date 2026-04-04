import type { SiteEnrichment } from './data.js'

function scoreArea(acres: number): number {
  if (acres >= 5) return 100
  if (acres >= 2) return 75
  if (acres >= 1) return 50
  if (acres >= 0.5) return 25
  return 0
}

function scoreSubstation(dist: number): number {
  if (dist < 0.25) return 100
  if (dist < 0.5) return 80
  if (dist < 1.0) return 60
  if (dist < 2.0) return 30
  return 0
}

function scoreHosting(tier: string): number {
  switch (tier) { case 'High': return 100; case 'Medium': return 60; case 'Unknown': return 40; case 'Low': return 20; default: return 40 }
}

function scoreFlood(zone: string): number {
  if (zone.startsWith('X')) return 100
  if (zone === 'A') return 50
  if (['AE', 'AO', 'VE'].includes(zone)) return 0
  return 50
}

function scoreWetland(w: boolean | null): number {
  if (w === false) return 100
  if (w === true) return 25
  return 70
}

function scoreZoning(c: string): number {
  switch (c) { case 'Yes': return 100; case 'Review': return 50; case 'No': return 0; default: return 50 }
}

function normalize(w: Record<string, number>): Record<string, number> {
  const sum = Object.values(w).reduce((a, b) => a + b, 0)
  if (sum === 0) return w
  const r: Record<string, number> = {}
  for (const [k, v] of Object.entries(w)) r[k] = v / sum
  return r
}

export interface TechWeights { area: number; substation: number; hosting: number; flood: number; wetland: number; zoning: number }
export interface CommWeights { ira: number; miso: number; ceja: number; brownfield: number; zoning: number; enterprise: number }

export function scoreTechnical(e: SiteEnrichment, raw: TechWeights) {
  const w = normalize(raw as unknown as Record<string, number>)
  const c = { area: scoreArea(e.developable_area_acres), substation: scoreSubstation(e.nearest_substation_dist_mi), hosting: scoreHosting(e.hosting_capacity_tier), flood: scoreFlood(e.fema_flood_zone), wetland: scoreWetland(e.wetland_within_500ft), zoning: scoreZoning(e.zoning_compatible) }
  const total = Math.round((c.area * (w.area ?? 0) + c.substation * (w.substation ?? 0) + c.hosting * (w.hosting ?? 0) + c.flood * (w.flood ?? 0) + c.wetland * (w.wetland ?? 0) + c.zoning * (w.zoning ?? 0)) * 10) / 10
  return { total, components: c }
}

export function scoreCommercial(e: SiteEnrichment, raw: CommWeights) {
  const w = normalize(raw as unknown as Record<string, number>)
  const c = { ira: e.ira_energy_community ? 100 : 0, miso: e.miso_lrz === '4' ? 80 : 40, ceja: e.ceja_ej_community ? 100 : 0, brownfield: e.epa_brownfield ? 100 : 0, zoning: scoreZoning(e.zoning_compatible), enterprise: e.il_enterprise_zone ? 100 : 0 }
  const total = Math.round((c.ira * (w.ira ?? 0) + c.miso * (w.miso ?? 0) + c.ceja * (w.ceja ?? 0) + c.brownfield * (w.brownfield ?? 0) + c.zoning * (w.zoning ?? 0) + c.enterprise * (w.enterprise ?? 0)) * 10) / 10
  return { total, components: c }
}

export function computeBreakdown(e: SiteEnrichment, tw: TechWeights, cw: CommWeights, balance: number) {
  const tech = scoreTechnical(e, tw)
  const comm = scoreCommercial(e, cw)
  const composite = Math.round((tech.total * balance + comm.total * (1 - balance)) * 10) / 10
  return { technical: tech, commercial: comm, composite }
}

export interface HardFilters {
  exclude_high_flood?: boolean; min_developable_area?: boolean; exclude_zoning_no?: boolean
  require_hosting_data?: boolean; require_ira_adder?: boolean; require_ej_community?: boolean; require_brownfield?: boolean
}

export function applyFilters(e: SiteEnrichment, f: HardFilters): boolean {
  if (f.exclude_high_flood && e.fema_flood_risk_tier === 'High') return false
  if (f.min_developable_area && e.developable_area_acres < 0.5) return false
  if (f.exclude_zoning_no && e.zoning_compatible === 'No') return false
  if (f.require_hosting_data && e.hosting_capacity_tier === 'Unknown') return false
  if (f.require_ira_adder && !e.ira_energy_community) return false
  if (f.require_ej_community && !e.ceja_ej_community) return false
  if (f.require_brownfield && !e.epa_brownfield) return false
  return true
}
