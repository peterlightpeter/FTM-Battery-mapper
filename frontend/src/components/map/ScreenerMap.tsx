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

  const combinedSites = useMemo(
    () => [...allSites, ...customSites],
    [allSites, customSites],
  )

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    if (!MAPBOX_TOKEN) return

    mapboxgl.accessToken = MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-88.5, 41.8],
      zoom: 8,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.on('load', () => {
      // --- Sources ---
      map.addSource('power-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // Load power lines from static file at runtime
      fetch('/nearby-power-lines.json')
        .then(r => r.json())
        .then(data => {
          const src = map.getSource('power-lines') as mapboxgl.GeoJSONSource | undefined
          if (src) src.setData(data)
        })
        .catch(() => {})

      map.addSource('boundaries-geojson', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addSource('interconnect-lines-geojson', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addSource('interconnect-points-geojson', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addSource('sites-geojson', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // --- Layers (bottom to top) ---

      // Distribution / transmission power lines (always visible when zoomed in)
      map.addLayer({
        id: 'power-lines-bg',
        type: 'line',
        source: 'power-lines',
        minzoom: 10,
        paint: {
          'line-color': [
            'match', ['get', 't'],
            'minor_line', '#F59E0B',
            'cable', '#8B5CF6',
            '#F97316',
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 3],
          'line-opacity': 0.5,
        },
      })

      // Property boundary layer — purple outline
      map.addLayer({
        id: 'boundaries',
        type: 'line',
        source: 'boundaries-geojson',
        minzoom: 12,
        paint: {
          'line-color': '#9333EA',
          'line-width': 2,
          'line-opacity': 0.8,
        },
      })

      // Interconnection line — red dotted (site → nearest distribution line)
      map.addLayer({
        id: 'interconnect-lines',
        type: 'line',
        source: 'interconnect-lines-geojson',
        filter: ['==', ['get', 'site_id'], ''],
        paint: {
          'line-color': '#EF4444',
          'line-width': 2.5,
          'line-dasharray': [2, 3],
          'line-opacity': 0.95,
        },
      })

      // Interconnection endpoint marker (point on the distribution line)
      map.addLayer({
        id: 'interconnect-points',
        type: 'circle',
        source: 'interconnect-points-geojson',
        filter: ['==', ['get', 'site_id'], ''],
        paint: {
          'circle-radius': 7,
          'circle-color': '#EF4444',
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 2,
        },
      })

      // Interconnection label
      map.addLayer({
        id: 'interconnect-labels',
        type: 'symbol',
        source: 'interconnect-points-geojson',
        filter: ['==', ['get', 'site_id'], ''],
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-offset': [0, 1.8],
          'text-anchor': 'top',
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        },
        paint: {
          'text-color': '#EF4444',
          'text-halo-color': '#000000',
          'text-halo-width': 1.2,
        },
      })

      // Site circles
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

      // Selected site highlight
      map.addLayer({
        id: 'sites-selected',
        type: 'circle',
        source: 'sites-geojson',
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 8, 12, 14],
          'circle-color': 'transparent',
          'circle-stroke-color': '#FFFFFF',
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

    map.on('mouseenter', 'sites', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'sites', () => { map.getCanvas().style.cursor = '' })

    return () => { map.remove(); mapRef.current = null }
  }, [setSelectedSiteId])

  // Generate a rectangular property boundary polygon from lot area
  const makeBoundaryPolygon = useCallback((lat: number, lng: number, lotSqft: number) => {
    const areaM2 = lotSqft * 0.092903
    const side = Math.sqrt(areaM2)
    const halfSideLat = (side / 2) / 111320
    const halfSideLng = (side / 2) / (111320 * Math.cos(lat * Math.PI / 180))
    return [
      [lng - halfSideLng, lat - halfSideLat],
      [lng + halfSideLng, lat - halfSideLat],
      [lng + halfSideLng, lat + halfSideLat],
      [lng - halfSideLng, lat + halfSideLat],
      [lng - halfSideLng, lat - halfSideLat],
    ]
  }, [])

  // Format voltage string for display
  const formatVoltage = (v: string) => {
    if (!v) return 'Distribution'
    const voltages = [...new Set(v.split(';'))].map(s => {
      const kv = parseInt(s) / 1000
      return kv >= 1 ? `${kv}kV` : `${parseInt(s)}V`
    })
    return voltages.join(' / ')
  }

  // Update GeoJSON data when sites change
  const updateSource = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const sitesSource = map.getSource('sites-geojson') as mapboxgl.GeoJSONSource | undefined
    const boundariesSource = map.getSource('boundaries-geojson') as mapboxgl.GeoJSONSource | undefined
    const linesSource = map.getSource('interconnect-lines-geojson') as mapboxgl.GeoJSONSource | undefined
    const pointsSource = map.getSource('interconnect-points-geojson') as mapboxgl.GeoJSONSource | undefined
    if (!sitesSource) return

    // Site points
    sitesSource.setData({
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
    })

    // Property boundary polygons
    if (boundariesSource) {
      boundariesSource.setData({
        type: 'FeatureCollection',
        features: combinedSites.map((s) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [makeBoundaryPolygon(s.lat, s.lng, s.lot_area_sqft)],
          },
          properties: { id: s.id },
        })),
      })
    }

    // Interconnection lines (site → nearest distribution line point)
    if (linesSource) {
      linesSource.setData({
        type: 'FeatureCollection',
        features: combinedSites
          .filter((s) => s.enrichment.nearest_line_lat && s.enrichment.nearest_line_lng)
          .map((s) => ({
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [s.lng, s.lat],
                [s.enrichment.nearest_line_lng, s.enrichment.nearest_line_lat],
              ],
            },
            properties: { site_id: s.id },
          })),
      })
    }

    // Interconnection endpoint markers
    if (pointsSource) {
      pointsSource.setData({
        type: 'FeatureCollection',
        features: combinedSites
          .filter((s) => s.enrichment.nearest_line_lat && s.enrichment.nearest_line_lng)
          .map((s) => ({
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [s.enrichment.nearest_line_lng, s.enrichment.nearest_line_lat],
            },
            properties: {
              site_id: s.id,
              label: `⚡ Interconnect: ${formatVoltage(s.enrichment.nearest_line_voltage)} (${s.enrichment.nearest_line_dist_mi} mi)`,
            },
          })),
      })
    }
  }, [combinedSites, makeBoundaryPolygon])

  useEffect(() => {
    const tryUpdate = () => {
      if (mapRef.current?.isStyleLoaded()) {
        updateSource()
      } else {
        setTimeout(tryUpdate, 200)
      }
    }
    tryUpdate()
  }, [updateSource])

  // Fly to selected site & show interconnection line
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    if (selectedSiteId) {
      const site = combinedSites.find((s) => s.id === selectedSiteId)
      if (site) {
        map.flyTo({ center: [site.lng, site.lat], zoom: Math.max(map.getZoom(), 13), duration: 800 })
      }
      map.setFilter('sites-selected', ['==', ['get', 'id'], selectedSiteId])
      map.setFilter('interconnect-lines', ['==', ['get', 'site_id'], selectedSiteId])
      map.setFilter('interconnect-points', ['==', ['get', 'site_id'], selectedSiteId])
      map.setFilter('interconnect-labels', ['==', ['get', 'site_id'], selectedSiteId])
    } else {
      map.setFilter('sites-selected', ['==', ['get', 'id'], ''])
      map.setFilter('interconnect-lines', ['==', ['get', 'site_id'], ''])
      map.setFilter('interconnect-points', ['==', ['get', 'site_id'], ''])
      map.setFilter('interconnect-labels', ['==', ['get', 'site_id'], ''])
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
