import { create } from 'zustand'
import type { ScoredSite, SiteEnrichment, ScoreBreakdown } from '../types'

interface CustomSitesState {
  customSites: ScoredSite[]
  isUploading: boolean
  uploadError: string | null
  addCustomSites: (sites: ScoredSite[]) => void
  clearCustomSites: () => void
  setUploading: (v: boolean) => void
  setUploadError: (err: string | null) => void
}

export const useCustomSitesStore = create<CustomSitesState>((set) => ({
  customSites: [],
  isUploading: false,
  uploadError: null,
  addCustomSites: (sites) =>
    set((state) => ({ customSites: [...state.customSites, ...sites], uploadError: null })),
  clearCustomSites: () => set({ customSites: [], uploadError: null }),
  setUploading: (v) => set({ isUploading: v }),
  setUploadError: (err) => set({ uploadError: err, isUploading: false }),
}))

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

function makeDefaultEnrichment(siteId: string): SiteEnrichment {
  return {
    site_id: siteId,
    nearest_substation_name: 'Unknown',
    nearest_substation_id: 'SUB-000',
    nearest_substation_dist_mi: 0,
    nearest_substation_kv: 0,
    nearest_substation_lat: 0,
    nearest_substation_lng: 0,
    hosting_capacity_tier: 'Unknown',
    hosting_capacity_mw_min: null,
    hosting_capacity_mw_max: null,
    miso_lrz: '',
    miso_pnode_id: '',
    miso_pnode_name: '',
    fema_flood_zone: 'X',
    fema_flood_risk_tier: 'Low',
    wetland_within_500ft: false,
    wetland_type: null,
    developable_area_acres: 0,
    zoning_code: '',
    zoning_description: '',
    zoning_compatible: 'Review',
    ira_energy_community: false,
    ira_ec_type: null,
    ceja_ej_community: false,
    ejscreen_score: 0,
    epa_brownfield: false,
    il_enterprise_zone: false,
    enriched_at: new Date().toISOString(),
  }
}

function makeDefaultBreakdown(): ScoreBreakdown {
  return {
    technical: {
      total: 0,
      components: { area: 0, substation: 0, hosting: 0, flood: 0, wetland: 0, zoning: 0 },
    },
    commercial: {
      total: 0,
      components: { ira: 0, miso: 0, ceja: 0, brownfield: 0, zoning: 0, enterprise: 0 },
    },
    composite: 0,
  }
}

interface CsvRow {
  name: string
  address: string
  city: string
  state: string
  zip: string
  buildingType: string
  utilityName: string
}

function parseCsvText(text: string): CsvRow[] {
  const lines = text.trim().split('\n')
  const rows: CsvRow[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Skip header row if it looks like one
    if (i === 0 && line.toLowerCase().includes('name') && line.toLowerCase().includes('address')) {
      continue
    }

    const cols = line.split(',').map((c) => c.trim())
    if (cols.length < 5) continue

    rows.push({
      name: cols[0] || '',
      address: cols[1] || '',
      city: cols[2] || '',
      state: cols[3] || '',
      zip: cols[4] || '',
      buildingType: cols[5] || '',
      utilityName: cols[6] || '',
    })
  }
  return rows
}

async function geocodeAddress(address: string, city: string, state: string, zip: string): Promise<{ lat: number; lng: number } | null> {
  const query = encodeURIComponent(`${address}, ${city}, ${state} ${zip}`)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&limit=1`

  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      return { lat, lng }
    }
    return null
  } catch {
    return null
  }
}

export async function processCSVUpload(file: File) {
  const store = useCustomSitesStore.getState()
  store.setUploading(true)
  store.setUploadError(null)

  try {
    const text = await file.text()
    const rows = parseCsvText(text)

    if (rows.length === 0) {
      store.setUploadError('No valid rows found in CSV')
      return
    }

    const sites: ScoredSite[] = []
    let failedCount = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const coords = await geocodeAddress(row.address, row.city, row.state, row.zip)

      if (!coords) {
        failedCount++
        continue
      }

      const id = `custom-${Date.now()}-${i}`

      sites.push({
        id,
        external_id: `CSV-${String(i + 1).padStart(5, '0')}`,
        name: row.name || row.address,
        address: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip,
        owner_name: '',
        owner_entity: '',
        building_type: row.buildingType,
        utility_name: row.utilityName,
        lat: coords.lat,
        lng: coords.lng,
        lot_area_sqft: 0,
        building_area_sqft: 0,
        enrichment: makeDefaultEnrichment(id),
        technical_score: 0,
        commercial_score: 0,
        composite_score: 50,
        rank: 0,
        score_breakdown: makeDefaultBreakdown(),
      })
    }

    if (sites.length === 0) {
      store.setUploadError('Could not geocode any addresses from the CSV')
      return
    }

    store.addCustomSites(sites)

    if (failedCount > 0) {
      store.setUploadError(`Imported ${sites.length} sites. ${failedCount} address(es) could not be geocoded.`)
    }

    store.setUploading(false)
  } catch (err) {
    store.setUploadError(`Failed to process CSV: ${err instanceof Error ? err.message : String(err)}`)
  }
}
