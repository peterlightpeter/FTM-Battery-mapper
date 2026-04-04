import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUiStore } from '../../store/uiStore'
import { useScoredSites } from '../../hooks/useScoredSites'
import ScoreBadge from '../table/ScoreBadge'
import ScoreBreakdown from './ScoreBreakdown'
import AttributeTable from './AttributeTable'

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

      {/* Score Breakdown */}
      <ScoreBreakdown breakdown={site.score_breakdown} />

      {/* Attribute Table */}
      <div className="border-t border-lumen-concrete-200 pt-4">
        <AttributeTable enrichment={site.enrichment} />
      </div>
    </div>
  )
}
