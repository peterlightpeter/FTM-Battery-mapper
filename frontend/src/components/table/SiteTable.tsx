import { useScoredSites } from '../../hooks/useScoredSites'
import { useUiStore } from '../../store/uiStore'
import { useFilterStore } from '../../store/filterStore'
import ScoreBadge from './ScoreBadge'
import type { FilterState } from '../../types'

const SORTABLE_COLUMNS: Array<{ key: FilterState['sortBy']; label: string }> = [
  { key: 'composite_score', label: 'Composite' },
  { key: 'technical_score', label: 'Technical' },
  { key: 'commercial_score', label: 'Commercial' },
  { key: 'developable_area_acres', label: 'Area (ac)' },
  { key: 'nearest_substation_dist_mi', label: 'Sub. Dist (mi)' },
]

export default function SiteTable() {
  const { sites, total, page, pages } = useScoredSites()
  const selectedSiteId = useUiStore((s) => s.selectedSiteId)
  const setSelectedSiteId = useUiStore((s) => s.setSelectedSiteId)
  const sortBy = useFilterStore((s) => s.sortBy)
  const sortDir = useFilterStore((s) => s.sortDir)
  const setSortBy = useFilterStore((s) => s.setSortBy)
  const setSortDir = useFilterStore((s) => s.setSortDir)
  const setPage = useFilterStore((s) => s.setPage)

  function handleSort(key: FilterState['sortBy']) {
    if (sortBy === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
  }

  function SortIcon({ col }: { col: FilterState['sortBy'] }) {
    if (sortBy !== col) return <span className="text-lumen-concrete ml-0.5">↕</span>
    return <span className="text-lumen-sky-blue-500 ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-1.5 bg-white border-b border-lumen-concrete-100 flex items-center justify-between shrink-0">
        <span className="text-xs text-lumen-graphite-100">
          {total} sites — page {page} of {pages}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-lumen-concrete-100 sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-lumen-graphite-100 w-8">#</th>
              <th className="text-left px-2 py-1.5 font-medium text-lumen-graphite-100 min-w-[160px]">Address</th>
              {SORTABLE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="text-right px-2 py-1.5 font-medium text-lumen-graphite-100 cursor-pointer hover:text-lumen-black select-none whitespace-nowrap"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </th>
              ))}
              <th className="text-left px-2 py-1.5 font-medium text-lumen-graphite-100">Hosting</th>
              <th className="text-left px-2 py-1.5 font-medium text-lumen-graphite-100">Flood</th>
              <th className="text-center px-2 py-1.5 font-medium text-lumen-graphite-100">IRA</th>
              <th className="text-left px-2 py-1.5 font-medium text-lumen-graphite-100 min-w-[120px]">Type</th>
              <th className="text-left px-2 py-1.5 font-medium text-lumen-graphite-100 min-w-[100px]">Utility</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr
                key={site.id}
                onClick={() => setSelectedSiteId(site.id)}
                className={`border-b border-lumen-concrete-100 cursor-pointer transition-colors ${
                  selectedSiteId === site.id
                    ? 'bg-lumen-electric-yellow-tint'
                    : 'hover:bg-lumen-sky-blue-100/30'
                }`}
              >
                <td className="px-2 py-1.5 text-lumen-graphite-100 font-mono">{site.rank}</td>
                <td className="px-2 py-1.5">
                  <div className="font-medium truncate">{site.name || site.address}</div>
                  <div className="text-lumen-graphite-100 truncate">{site.address}, {site.city}</div>
                </td>
                <td className="px-2 py-1.5 text-right"><ScoreBadge score={site.composite_score} /></td>
                <td className="px-2 py-1.5 text-right font-mono">{site.technical_score.toFixed(1)}</td>
                <td className="px-2 py-1.5 text-right font-mono">{site.commercial_score.toFixed(1)}</td>
                <td className="px-2 py-1.5 text-right font-mono">{site.enrichment.developable_area_acres.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-right font-mono">{site.enrichment.nearest_substation_dist_mi.toFixed(2)}</td>
                <td className="px-2 py-1.5">
                  <HostingBadge tier={site.enrichment.hosting_capacity_tier} />
                </td>
                <td className="px-2 py-1.5 text-lumen-graphite-100">{site.enrichment.fema_flood_zone}</td>
                <td className="px-2 py-1.5 text-center">
                  {site.enrichment.ira_energy_community ? (
                    <span className="inline-block w-4 h-4 rounded-full bg-lumen-electric-yellow text-[10px] leading-4 text-center">✓</span>
                  ) : (
                    <span className="text-lumen-concrete">—</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-lumen-graphite-100 truncate max-w-[140px]">{site.building_type}</td>
                <td className="px-2 py-1.5 text-lumen-graphite-100 truncate max-w-[120px]">{site.utility_name === 'Commonwealth Edison Co' ? 'ComEd' : site.utility_name === 'Ameren Illinois' ? 'Ameren' : site.utility_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="px-3 py-1.5 bg-white border-t border-lumen-concrete-100 flex items-center gap-2 shrink-0">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-2 py-0.5 text-xs border border-lumen-concrete-200 rounded disabled:opacity-40 cursor-pointer"
          >
            Prev
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-2 py-0.5 text-xs rounded cursor-pointer ${
                p === page ? 'bg-lumen-sky-blue text-lumen-black font-medium' : 'hover:bg-lumen-concrete-100'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
            className="px-2 py-0.5 text-xs border border-lumen-concrete-200 rounded disabled:opacity-40 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

function HostingBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    High: 'bg-lumen-electric-yellow text-lumen-black',
    Medium: 'bg-lumen-sky-blue text-lumen-black',
    Low: 'bg-lumen-danger/20 text-lumen-danger',
    Unknown: 'bg-lumen-concrete-100 text-lumen-graphite-100',
  }
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[tier] || colors.Unknown}`}>
      {tier}
    </span>
  )
}
