import { useCallback } from 'react'
import LumenNav from '../components/shared/LumenNav'
import FilterPanel from '../components/filters/FilterPanel'
import ScreenerMap from '../components/map/ScreenerMap'
import SiteTable from '../components/table/SiteTable'
import SiteDetailPanel from '../components/detail/SiteDetailPanel'
import { useUiStore } from '../store/uiStore'
import { useScoredSites } from '../hooks/useScoredSites'
import { exportSitesToCsv } from '../lib/csv-export'

export default function Screener() {
  const selectedSiteId = useUiStore((s) => s.selectedSiteId)
  const { allSites } = useScoredSites()

  const handleExportCsv = useCallback(() => {
    exportSitesToCsv(allSites)
  }, [allSites])

  return (
    <div className="h-full flex flex-col">
      <LumenNav onExportCsv={handleExportCsv} />
      <div className="flex flex-1 min-h-0">
        {/* Filter Panel */}
        <aside className="w-80 shrink-0 bg-lumen-concrete-100 border-r border-lumen-concrete-200 overflow-y-auto">
          <FilterPanel />
        </aside>

        {/* Map + Table */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Map */}
          <div className="flex-1 min-h-0 relative">
            <ScreenerMap />
          </div>
          {/* Table */}
          <div className="h-[40%] min-h-[200px] border-t border-lumen-concrete-200 overflow-auto">
            <SiteTable />
          </div>
        </div>

        {/* Detail Panel */}
        {selectedSiteId && (
          <aside className="w-[400px] shrink-0 border-l border-lumen-concrete-200 overflow-y-auto bg-white">
            <SiteDetailPanel />
          </aside>
        )}
      </div>
    </div>
  )
}
