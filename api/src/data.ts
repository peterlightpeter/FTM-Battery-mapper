import { readFileSync } from 'fs'
import { join } from 'path'

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
  hosting_capacity_tier: string
  hosting_capacity_mw_min: number | null
  hosting_capacity_mw_max: number | null
  miso_lrz: string
  miso_pnode_id: string
  miso_pnode_name: string
  fema_flood_zone: string
  fema_flood_risk_tier: string
  wetland_within_500ft: boolean
  wetland_type: string | null
  developable_area_acres: number
  zoning_code: string
  zoning_description: string
  zoning_compatible: string
  ira_energy_community: boolean
  ira_ec_type: string | null
  ceja_ej_community: boolean
  ejscreen_score: number
  epa_brownfield: boolean
  il_enterprise_zone: boolean
  enriched_at: string
}

interface RawSite {
  name: string
  address: string
  city: string
  state: string
  zip: string
  building_type: string
  utility: string
  lat: number
  lng: number
}

const customerSites: RawSite[] = JSON.parse(
  readFileSync(join(__dirname, 'customer-sites.json'), 'utf8')
)

const SUBSTATIONS = [
  { name: 'Joliet North', kv: 138 },{ name: 'Aurora West', kv: 138 },{ name: 'Chicago Loop', kv: 345 },
  { name: 'Schaumburg Central', kv: 138 },{ name: 'Rockford East', kv: 69 },{ name: 'Naperville South', kv: 138 },
  { name: 'Waukegan Lake', kv: 138 },{ name: 'Elgin River', kv: 69 },{ name: 'DeKalb Prairie', kv: 69 },
  { name: 'Bolingbrook Industrial', kv: 138 },{ name: 'Kankakee Grid', kv: 69 },{ name: 'Cicero Junction', kv: 138 },
]
const FLOOD_ZONES = [
  { zone: 'X', risk: 'Low' },{ zone: 'X', risk: 'Low' },{ zone: 'X', risk: 'Low' },{ zone: 'X500', risk: 'Low' },
  { zone: 'A', risk: 'Medium' },{ zone: 'AE', risk: 'High' },{ zone: 'X', risk: 'Low' },{ zone: 'X', risk: 'Low' },
]
const HOSTING_TIERS = ['High','Medium','Medium','Low','Unknown','High','Medium']

function getZoningForBuildingType(buildingType: string) {
  const bt = buildingType.toLowerCase()
  if (bt.includes('industrial') || bt.includes('warehouse') || bt.includes('manufacturing'))
    return { code: 'I-2', desc: 'General Industrial', compat: 'Yes' }
  if (bt.includes('office'))
    return { code: 'C-3', desc: 'General Commercial', compat: 'Yes' }
  if (bt.includes('retail') || bt.includes('strip mall') || bt.includes('standalone'))
    return { code: 'C-1', desc: 'Neighborhood Commercial', compat: 'Review' }
  if (bt.includes('multi-family'))
    return { code: 'R-3', desc: 'Residential Multi-Family', compat: 'No' }
  if (bt.includes('parking'))
    return { code: 'PD', desc: 'Planned Development', compat: 'Review' }
  if (bt.includes('outpatient') || bt.includes('medical'))
    return { code: 'C-3', desc: 'General Commercial', compat: 'Yes' }
  return { code: 'PD', desc: 'Planned Development', compat: 'Review' }
}

function seededRandom(seed: number) {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647 }
}

function generateMockData() {
  const rand = seededRandom(42)
  const sites: Array<{ site: Site; enrichment: SiteEnrichment }> = []

  for (let i = 0; i < customerSites.length; i++) {
    const raw = customerSites[i]
    const sub = SUBSTATIONS[Math.floor(rand() * SUBSTATIONS.length)]
    const fz = FLOOD_ZONES[Math.floor(rand() * FLOOD_ZONES.length)]
    const ht = HOSTING_TIERS[Math.floor(rand() * HOSTING_TIERS.length)]
    const zn = getZoningForBuildingType(raw.building_type)
    const lot = Math.round((rand() * 400000 + 10000) * 100) / 100
    const bld = Math.round(lot * (rand() * 0.4 + 0.1) * 100) / 100
    const dev = Math.round(((lot - bld) / 43560) * 10000) / 10000
    const dist = Math.round((rand() * 3 + 0.1) * 10000) / 10000
    const id = `site-${String(i + 1).padStart(3, '0')}`

    sites.push({
      site: {
        id, external_id: `LUM-${String(i + 1).padStart(5, '0')}`,
        name: raw.name || raw.address, address: raw.address,
        city: raw.city, state: raw.state, zip: raw.zip,
        owner_name: '', owner_entity: '',
        building_type: raw.building_type, utility_name: raw.utility,
        lat: raw.lat, lng: raw.lng,
        lot_area_sqft: lot, building_area_sqft: bld,
      },
      enrichment: {
        site_id: id, nearest_substation_name: sub.name,
        nearest_substation_id: `SUB-${Math.floor(rand() * 900) + 100}`,
        nearest_substation_dist_mi: dist, nearest_substation_kv: sub.kv,
        hosting_capacity_tier: ht,
        hosting_capacity_mw_min: ht === 'High' ? 6 : ht === 'Medium' ? 3 : ht === 'Low' ? 0 : null,
        hosting_capacity_mw_max: ht === 'High' ? 15 : ht === 'Medium' ? 6 : ht === 'Low' ? 3 : null,
        miso_lrz: raw.utility.includes('Ameren') ? '8' : '4',
        miso_pnode_id: `PNODE-${Math.floor(rand() * 9000) + 1000}`,
        miso_pnode_name: `${raw.city.toUpperCase()}.${sub.name.split(' ')[0].toUpperCase()}`,
        fema_flood_zone: fz.zone, fema_flood_risk_tier: fz.risk,
        wetland_within_500ft: rand() < 0.2,
        wetland_type: rand() < 0.2 ? 'Freshwater Emergent' : null,
        developable_area_acres: dev, zoning_code: zn.code,
        zoning_description: zn.desc, zoning_compatible: zn.compat,
        ira_energy_community: rand() < 0.35,
        ira_ec_type: rand() < 0.35 ? (rand() < 0.5 ? 'Coal Closure' : 'Fossil Fuel Employment') : null,
        ceja_ej_community: rand() < 0.25,
        ejscreen_score: Math.round(rand() * 100 * 100) / 100,
        epa_brownfield: rand() < 0.15,
        il_enterprise_zone: rand() < 0.2,
        enriched_at: '2025-04-03T10:00:00Z',
      },
    })
  }
  return sites
}

export const mockData = generateMockData()
