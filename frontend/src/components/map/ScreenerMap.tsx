import { useEffect, useRef, useCallback, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useScoredSites } from '../../hooks/useScoredSites'
import { useUiStore } from '../../store/uiStore'
import { useCustomSitesStore } from '../../store/customSitesStore'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

export default function ScreenerMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const { allSites } = useScoredSites()
  const customSites = useCustomSitesStore((s) => s.customSites)
  const selectedSiteId = useUiStore((s) => s.selectedSiteId)
  const setSelectedSiteId = useUiStore((s) => s.setSelectedSiteId)

  // Combine scored sites with uploaded custom sites
  const combinedSites = useMemo(
    () => [...allSites, ...customSites],
    [allSites, customSites],
  )

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    if (!MAPBOX_TOKEN) {
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-88.5, 41.8],
      zoom: 8,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.on('load', () => {
      map.addSource('sites-geojson', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'sites',
        type: 'circle',
        source: 'sites-geojson',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 5, 12, 10],
          'circle-color': [
            'interpolate', ['linear'], ['get', 'composite_score'],
            0, '#9FA38F',
            25, '#77AFD7',
            50, '#B1E5FF',
            75, '#DFFF5E',
            90, '#B8D150',
          ],
          'circle-stroke-color': '#1A1A1A',
          'circle-stroke-width': 0.5,
          'circle-opacity': 0.85,
        },
      })

      // Selected site highlight layer
      map.addLayer({
        id: 'sites-selected',
        type: 'circle',
        source: 'sites-geojson',
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 8, 12, 14],
          'circle-color': 'transparent',
          'circle-stroke-color': '#1A1A1A',
          'circle-stroke-width': 3,
        },
      })

      mapRef.current = map
    })

    map.on('click', 'sites', (e) => {
      const feature = e.features?.[0]
      if (feature?.properties?.id) {
        setSelectedSiteId(feature.properties.id as string)
      }
    })

    map.on('mouseenter', 'sites', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'sites', () => {
      map.getCanvas().style.cursor = ''
    })

    return () => { map.remove(); mapRef.current = null }
  }, [setSelectedSiteId])

  // Update GeoJSON data when sites change
  const updateSource = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const source = map.getSource('sites-geojson') as mapboxgl.GeoJSONSource | undefined
    if (!source) return

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: combinedSites.map((s) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
        properties: {
          id: s.id,
          composite_score: s.composite_score,
          name: s.name || s.address,
          address: s.address,
          city: s.city,
          building_type: s.building_type,
          utility_name: s.utility_name,
        },
      })),
    }
    source.setData(geojson)
  }, [combinedSites])

  useEffect(() => {
    // Retry a few times until map is loaded
    const tryUpdate = () => {
      if (mapRef.current?.isStyleLoaded()) {
        updateSource()
      } else {
        setTimeout(tryUpdate, 200)
      }
    }
    tryUpdate()
  }, [updateSource])

  // Fly to selected site
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    if (selectedSiteId) {
      const site = combinedSites.find((s) => s.id === selectedSiteId)
      if (site) {
        map.flyTo({ center: [site.lng, site.lat], zoom: Math.max(map.getZoom(), 11), duration: 800 })
      }
      map.setFilter('sites-selected', ['==', ['get', 'id'], selectedSiteId])
    } else {
      map.setFilter('sites-selected', ['==', ['get', 'id'], ''])
    }
  }, [selectedSiteId, combinedSites])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full bg-lumen-concrete-100 flex flex-col items-center justify-center gap-2">
        <p className="text-lumen-graphite-100 text-sm font-medium">Mapbox token not configured</p>
        <p className="text-lumen-concrete text-xs">Set VITE_MAPBOX_TOKEN in .env to enable the map</p>
        <p className="text-lumen-concrete text-xs">{combinedSites.length} sites loaded</p>
      </div>
    )
  }

  return <div ref={mapContainer} className="w-full h-full" />
}
