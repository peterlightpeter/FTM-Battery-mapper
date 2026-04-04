import type { SiteEnrichment } from '../../types'

const ATTRS: Array<{ key: keyof SiteEnrichment; label: string; format?: (v: unknown, e: SiteEnrichment) => string }> = [
  { key: 'nearest_substation_name', label: 'Nearest Substation' },
  { key: 'nearest_substation_kv', label: 'Substation Voltage', format: (v) => `${v} kV` },
  { key: 'nearest_substation_dist_mi', label: 'Distance', format: (v) => `${Number(v).toFixed(2)} mi` },
  { key: 'miso_pnode_name', label: 'MISO Pnode' },
  { key: 'miso_lrz', label: 'MISO LRZ', format: (v) => `LRZ ${v}` },
  { key: 'hosting_capacity_tier', label: 'Hosting Capacity' },
  {
    key: 'hosting_capacity_mw_min',
    label: 'Hosting Range',
    format: (_v, e) =>
      e.hosting_capacity_mw_min != null ? `${e.hosting_capacity_mw_min}–${e.hosting_capacity_mw_max} MW` : 'N/A',
  },
  { key: 'fema_flood_zone', label: 'Flood Zone' },
  { key: 'fema_flood_risk_tier', label: 'Flood Risk' },
  { key: 'wetland_within_500ft', label: 'Wetland within 500ft', format: (v) => v ? 'Yes' : 'No' },
  { key: 'zoning_code', label: 'Zoning Code' },
  { key: 'zoning_description', label: 'Zoning Description' },
  { key: 'zoning_compatible', label: 'Zoning Compatible' },
  { key: 'developable_area_acres', label: 'Developable Area', format: (v) => `${Number(v).toFixed(2)} acres` },
  { key: 'ira_energy_community', label: 'IRA Energy Community', format: (v) => v ? 'Yes' : 'No' },
  { key: 'ira_ec_type', label: 'IRA Type', format: (v) => (v as string) || 'N/A' },
  { key: 'ceja_ej_community', label: 'CEJA EJ Community', format: (v) => v ? 'Yes' : 'No' },
  { key: 'ejscreen_score', label: 'EJScreen Score', format: (v) => Number(v).toFixed(1) },
  { key: 'epa_brownfield', label: 'EPA Brownfield', format: (v) => v ? 'Yes' : 'No' },
  { key: 'il_enterprise_zone', label: 'Enterprise Zone', format: (v) => v ? 'Yes' : 'No' },
  { key: 'enriched_at', label: 'Last Enriched', format: (v) => new Date(v as string).toLocaleDateString() },
]

export default function AttributeTable({ enrichment }: { enrichment: SiteEnrichment }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-lumen-graphite-100 uppercase tracking-wider mb-2">Site Data</h4>
      <div className="divide-y divide-lumen-concrete-100">
        {ATTRS.map((attr) => {
          const raw = enrichment[attr.key]
          const display = attr.format ? attr.format(raw, enrichment) : String(raw ?? 'N/A')
          return (
            <div key={attr.key} className="flex justify-between py-1.5 text-xs">
              <span className="text-lumen-graphite-100">{attr.label}</span>
              <span className="text-lumen-black font-medium text-right ml-2">{display}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
