import HardFilters from './HardFilters'
import WeightSliders from './WeightSliders'
import TechCommBalance from './TechCommBalance'
import { useScoredSites } from '../../hooks/useScoredSites'
import { mockSitesWithEnrichment } from '../../data/mock-sites'

export default function FilterPanel() {
  const { total } = useScoredSites()

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="font-display text-lg">Filters & Weights</h2>
        <p className="text-xs text-lumen-graphite-100 mt-1">
          <span className="font-medium text-lumen-black">{total}</span>
          {' / '}
          {mockSitesWithEnrichment.length} sites
        </p>
      </div>

      <HardFilters />

      <div className="border-t border-lumen-concrete-200 pt-4">
        <TechCommBalance />
      </div>

      <div className="border-t border-lumen-concrete-200 pt-4">
        <WeightSliders />
      </div>
    </div>
  )
}
