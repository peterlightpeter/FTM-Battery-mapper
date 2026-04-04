import type { ScoreBreakdown as ScoreBreakdownType } from '../../types'

const TECH_LABELS: Record<string, string> = {
  area: 'Developable Area',
  substation: 'Substation Distance',
  hosting: 'Hosting Capacity',
  flood: 'Flood Zone',
  wetland: 'Wetland Proximity',
  zoning: 'Zoning',
}

const COMM_LABELS: Record<string, string> = {
  ira: 'IRA Energy Community',
  miso: 'MISO LRZ',
  ceja: 'CEJA / EJ Community',
  brownfield: 'EPA Brownfield',
  zoning: 'Zoning',
  enterprise: 'Enterprise Zone',
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-lumen-graphite-100 w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-lumen-concrete-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-lumen-sky-blue rounded-full transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono text-lumen-black w-8 text-right">{score}</span>
    </div>
  )
}

export default function ScoreBreakdown({ breakdown }: { breakdown: ScoreBreakdownType }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-medium text-lumen-graphite-100 uppercase tracking-wider mb-2">Technical Breakdown</h4>
        <div className="space-y-1.5">
          {Object.entries(breakdown.technical.components).map(([key, val]) => (
            <ScoreBar key={key} label={TECH_LABELS[key] || key} score={val} />
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-medium text-lumen-graphite-100 uppercase tracking-wider mb-2">Commercial Breakdown</h4>
        <div className="space-y-1.5">
          {Object.entries(breakdown.commercial.components).map(([key, val]) => (
            <ScoreBar key={key} label={COMM_LABELS[key] || key} score={val} />
          ))}
        </div>
      </div>
    </div>
  )
}
