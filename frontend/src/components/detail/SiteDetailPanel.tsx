import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUiStore } from '../../store/uiStore'
import { useScoredSites } from '../../hooks/useScoredSites'
import ScoreBadge from '../table/ScoreBadge'
import ScoreBreakdown from './ScoreBreakdown'
import AttributeTable from './AttributeTable'

function formatVoltage(v: string) {
  if (!v) return '—'
  const voltages = [...new Set(v.split(';'))].map(s => {
    const kv = parseInt(s) / 1000
    return kv >= 1 ? `${kv}kV` : `${parseInt(s)}V`
  })
  return voltages.join(' / ')
}

export default function SiteDetailPanel() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const selectedSiteId = useUiStore((s) => s.selectedSiteId)
  const setSelectedSiteId = useUiStore((s) => s.setSelectedSiteId)
  const { allSites } = useScoredSites()

  // Sync URL param to store
  useEffect(() => {
    if (siteId && siteId !== selectedSiteId) {
      setSelectedSiteId(siteId)
    }
  }, [siteId, selectedSiteId, setSelectedSiteId])

  // Sync store to URL
  useEffect(() => {
    if (selectedSiteId) {
      navigate(`/screener/${selectedSiteId}`, { replace: true })
    }
  }, [selectedSiteId, navigate])

  const site = allSites.find((s) => s.id === selectedSiteId)
  if (!site) return null

  function handleClose() {
    setSelectedSiteId(null)
    navigate('/screener', { replace: true })
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-base leading-tight">{site.name || site.address}</h2>
            <p className="text-xs text-lumen-graphite-100 mt-0.5">
              {site.address} — {site.city}, {site.state} {site.zip}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-lumen-graphite-100 hover:text-lumen-black text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="text-xs text-lumen-graphite-100 mt-1 space-y-0.5">
          <div>
            <span className="font-medium">{site.building_type}</span>
            <span className="mx-1">·</span>
            <span>{site.utility_name}</span>
          </div>
          <div>
            <span>Lot: {(site.lot_area_sqft / 43560).toFixed(1)} ac</span>
            <span className="mx-1">·</span>
            <span>Building: {(site.building_area_sqft / 43560).toFixed(1)} ac</span>
          </div>
        </div>
      </div>

      {/* Score Summary */}
      <div className="bg-lumen-concrete-100 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-lumen-graphite-100 uppercase">Composite Score</span>
          <ScoreBadge score={site.composite_score} size="lg" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-lumen-graphite-100 w-20">Technical</span>
            <div className="flex-1 h-2.5 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-lumen-sky-blue rounded-full"
                style={{ width: `${site.technical_score}%` }}
              />
            </div>
            <span className="text-xs font-mono font-medium w-10 text-right">{site.technical_score.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-lumen-graphite-100 w-20">Commercial</span>
            <div className="flex-1 h-2.5 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-lumen-sky-blue-400 rounded-full"
                style={{ width: `${site.commercial_score}%` }}
              />
            </div>
            <span className="text-xs font-mono font-medium w-10 text-right">{site.commercial_score.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Hosting Capacity & Grid Interconnection */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-medium uppercase text-red-700 tracking-wide">Grid Interconnection</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="text-lumen-graphite-100">Nearest Line</div>
          <div className="font-medium">{site.enrichment.nearest_line_dist_mi} mi</div>
          <div className="text-lumen-graphite-100">Line Type</div>
          <div className="font-medium capitalize">{site.enrichment.nearest_line_type === 'minor_line' ? 'Distribution' : site.enrichment.nearest_line_type === 'line' ? 'Transmission' : site.enrichment.nearest_line_type || '—'}</div>
          <div className="text-lumen-graphite-100">Line Voltage</div>
          <div className="font-medium">{formatVoltage(site.enrichment.nearest_line_voltage)}</div>
          <div className="text-lumen-graphite-100">Nearest Substation</div>
          <div className="font-medium">{site.enrichment.nearest_substation_name}</div>
          <div className="text-lumen-graphite-100">Substation kV</div>
          <div className="font-medium">{site.enrichment.nearest_substation_kv} kV</div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-medium uppercase text-amber-700 tracking-wide">BESS Hosting Capacity</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="text-lumen-graphite-100">Capacity Tier</div>
          <div className="font-medium">
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              site.enrichment.hosting_capacity_tier === 'High' ? 'bg-green-100 text-green-800' :
              site.enrichment.hosting_capacity_tier === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
              site.enrichment.hosting_capacity_tier === 'Low' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {site.enrichment.hosting_capacity_tier}
            </span>
          </div>
          <div className="text-lumen-graphite-100">Capacity Range</div>
          <div className="font-medium">
            {site.enrichment.hosting_capacity_mw_min !== null && site.enrichment.hosting_capacity_mw_max !== null
              ? `${site.enrichment.hosting_capacity_mw_min} – ${site.enrichment.hosting_capacity_mw_max} MW`
              : '—'}
          </div>
          <div className="text-lumen-graphite-100">MISO LRZ</div>
          <div className="font-medium">Zone {site.enrichment.miso_lrz}</div>
          <div className="text-lumen-graphite-100">MISO P-Node</div>
          <div className="font-medium text-[11px]">{site.enrichment.miso_pnode_name}</div>
        </div>
        <p className="text-[10px] text-amber-600 mt-1">
          Source: ComEd BESS Hosting Capacity Map (Q1 2026)
        </p>
      </div>

      {/* Score Breakdown */}
      <ScoreBreakdown breakdown={site.score_breakdown} />

      {/* Attribute Table */}
      <div className="border-t border-lumen-concrete-200 pt-4">
        <AttributeTable enrichment={site.enrichment} />
      </div>
    </div>
  )
}
