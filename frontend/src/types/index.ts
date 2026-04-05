export interface Site {
  id: string
  external_id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  owner_name: string
  owner_entity: string
  building_type: string
  utility_name: string
  lat: number
  lng: number
  lot_area_sqft: number
  building_area_sqft: number
}

export interface SiteEnrichment {
  site_id: string
  nearest_substation_name: string
  nearest_substation_id: string
  nearest_substation_dist_mi: number
  nearest_substation_kv: number
  nearest_substation_lat: number
  nearest_substation_lng: number
  nearest_line_lat: number
  nearest_line_lng: number
  nearest_line_dist_mi: number
  nearest_line_voltage: string
  nearest_line_type: string
  hosting_capacity_tier: 'High' | 'Medium' | 'Low' | 'Unknown'
  hosting_capacity_mw_min: number | null
  hosting_capacity_mw_max: number | null
  miso_lrz: string
  miso_pnode_id: string
  miso_pnode_name: string
  fema_flood_zone: string
  fema_flood_risk_tier: 'High' | 'Medium' | 'Low'
  wetland_within_500ft: boolean
  wetland_type: string | null
  developable_area_acres: number
  zoning_code: string
  zoning_description: string
  zoning_compatible: 'Yes' | 'Review' | 'No'
  ira_energy_community: boolean
  ira_ec_type: string | null
  ceja_ej_community: boolean
  ejscreen_score: number
  epa_brownfield: boolean
  il_enterprise_zone: boolean
  enriched_at: string
}

export interface ScoredSite extends Site {
  enrichment: SiteEnrichment
  technical_score: number
  commercial_score: number
  composite_score: number
  rank: number
  score_breakdown: ScoreBreakdown
}

export interface ScoreBreakdown {
  technical: {
    total: number
    components: {
      area: number
      substation: number
      hosting: number
      flood: number
      wetland: number
      zoning: number
    }
  }
  commercial: {
    total: number
    components: {
      ira: number
      miso: number
      ceja: number
      brownfield: number
      zoning: number
      enterprise: number
    }
  }
  composite: number
}

export interface TechnicalWeights {
  area: number
  substation: number
  hosting: number
  flood: number
  wetland: number
  zoning: number
}

export interface CommercialWeights {
  ira: number
  miso: number
  ceja: number
  brownfield: number
  zoning: number
  enterprise: number
}

export interface HardFilters {
  exclude_high_flood: boolean
  min_developable_area: boolean
  exclude_zoning_no: boolean
  require_hosting_data: boolean
  require_ira_adder: boolean
  require_ej_community: boolean
  require_brownfield: boolean
}

export interface FilterState {
  hardFilters: HardFilters
  techWeights: TechnicalWeights
  commWeights: CommercialWeights
  techCommBalance: number
  sortBy: 'composite_score' | 'technical_score' | 'commercial_score' | 'developable_area_acres' | 'nearest_substation_dist_mi'
  sortDir: 'asc' | 'desc'
  page: number
  limit: number
}
