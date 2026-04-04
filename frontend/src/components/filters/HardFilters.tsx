import { useFilterStore } from '../../store/filterStore'
import type { HardFilters as HardFiltersType } from '../../types'

const FILTER_LABELS: Record<keyof HardFiltersType, string> = {
  exclude_high_flood: 'Exclude High Flood Risk',
  min_developable_area: 'Min 0.5 Acres Developable',
  exclude_zoning_no: 'Exclude Incompatible Zoning',
  require_hosting_data: 'Require Hosting Data',
  require_ira_adder: 'Require IRA Energy Community',
  require_ej_community: 'Require EJ Community',
  require_brownfield: 'Require Brownfield',
}

export default function HardFilters() {
  const hardFilters = useFilterStore((s) => s.hardFilters)
  const setHardFilter = useFilterStore((s) => s.setHardFilter)

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-lumen-graphite-100 uppercase tracking-wider">Hard Filters</h3>
      {(Object.keys(FILTER_LABELS) as Array<keyof HardFiltersType>).map((key) => (
        <label key={key} className="flex items-center gap-2 cursor-pointer group">
          <button
            role="switch"
            aria-checked={hardFilters[key]}
            onClick={() => setHardFilter(key, !hardFilters[key])}
            className={`relative w-8 h-[18px] rounded-full transition-colors shrink-0 cursor-pointer ${
              hardFilters[key] ? 'bg-lumen-sky-blue' : 'bg-lumen-concrete-200'
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full transition-transform shadow-sm ${
                hardFilters[key] ? 'translate-x-[14px]' : ''
              }`}
            />
          </button>
          <span className="text-xs text-lumen-black group-hover:text-lumen-graphite-100">
            {FILTER_LABELS[key]}
          </span>
        </label>
      ))}
    </div>
  )
}
