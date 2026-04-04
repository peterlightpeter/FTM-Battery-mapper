import type { ScoredSite } from '../types'

export function exportSitesToCsv(sites: ScoredSite[]) {
  const headers = [
    'Rank', 'ID', 'Name', 'Address', 'City', 'State', 'ZIP',
    'Building Type', 'Utility',
    'Composite Score', 'Technical Score', 'Commercial Score',
    'Developable Area (ac)', 'Substation Distance (mi)',
    'Hosting Capacity', 'Flood Zone', 'Flood Risk',
    'IRA Energy Community', 'EJ Community', 'Brownfield',
    'Zoning Compatible', 'Enterprise Zone',
  ]

  const rows = sites.map((s) => [
    s.rank,
    s.external_id,
    `"${s.name || s.address}"`,
    `"${s.address}"`,
    s.city,
    s.state,
    s.zip,
    `"${s.building_type}"`,
    `"${s.utility_name}"`,
    s.composite_score,
    s.technical_score,
    s.commercial_score,
    s.enrichment.developable_area_acres,
    s.enrichment.nearest_substation_dist_mi,
    s.enrichment.hosting_capacity_tier,
    s.enrichment.fema_flood_zone,
    s.enrichment.fema_flood_risk_tier,
    s.enrichment.ira_energy_community,
    s.enrichment.ceja_ej_community,
    s.enrichment.epa_brownfield,
    s.enrichment.zoning_compatible,
    s.enrichment.il_enterprise_zone,
  ].join(','))

  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fom-sites-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
