import { useFilterStore } from '../../store/filterStore'
import type { TechnicalWeights, CommercialWeights } from '../../types'

const TECH_LABELS: Record<keyof TechnicalWeights, string> = {
  area: 'Developable Area',
  substation: 'Substation Distance',
  hosting: 'Hosting Capacity',
  flood: 'Flood Zone',
  wetland: 'Wetland Proximity',
  zoning: 'Zoning',
}

const COMM_LABELS: Record<keyof CommercialWeights, string> = {
  ira: 'IRA Energy Community',
  miso: 'MISO LRZ',
  ceja: 'CEJA / EJ Community',
  brownfield: 'Brownfield',
  zoning: 'Zoning',
  enterprise: 'Enterprise Zone',
}

function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-lumen-black w-28 shrink-0 truncate">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="flex-1 h-1 accent-lumen-sky-blue cursor-pointer"
      />
      <span className="text-xs text-lumen-graphite-100 w-8 text-right font-mono">
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}

export default function WeightSliders() {
  const techWeights = useFilterStore((s) => s.techWeights)
  const commWeights = useFilterStore((s) => s.commWeights)
  const setTechWeight = useFilterStore((s) => s.setTechWeight)
  const setCommWeight = useFilterStore((s) => s.setCommWeight)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-medium text-lumen-graphite-100 uppercase tracking-wider mb-2">
          Technical Weights
        </h3>
        <div className="space-y-1.5">
          {(Object.keys(TECH_LABELS) as Array<keyof TechnicalWeights>).map((key) => (
            <WeightSlider
              key={key}
              label={TECH_LABELS[key]}
              value={techWeights[key]}
              onChange={(v) => setTechWeight(key, v)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-lumen-graphite-100 uppercase tracking-wider mb-2">
          Commercial Weights
        </h3>
        <div className="space-y-1.5">
          {(Object.keys(COMM_LABELS) as Array<keyof CommercialWeights>).map((key) => (
            <WeightSlider
              key={key}
              label={COMM_LABELS[key]}
              value={commWeights[key]}
              onChange={(v) => setCommWeight(key, v)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
