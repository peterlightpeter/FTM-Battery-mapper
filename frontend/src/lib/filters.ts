import type { SiteEnrichment, HardFilters } from '../types'

export function applyHardFilters(enrichment: SiteEnrichment, filters: HardFilters): boolean {
  if (filters.exclude_high_flood && enrichment.fema_flood_risk_tier === 'High') {
    return false
  }
  if (filters.min_developable_area && enrichment.developable_area_acres < 0.5) {
    return false
  }
  if (filters.exclude_zoning_no && enrichment.zoning_compatible === 'No') {
    return false
  }
  if (filters.require_hosting_data && enrichment.hosting_capacity_tier === 'Unknown') {
    return false
  }
  if (filters.require_ira_adder && !enrichment.ira_energy_community) {
    return false
  }
  if (filters.require_ej_community && !enrichment.ceja_ej_community) {
    return false
  }
  if (filters.require_brownfield && !enrichment.epa_brownfield) {
    return false
  }
  return true
}
