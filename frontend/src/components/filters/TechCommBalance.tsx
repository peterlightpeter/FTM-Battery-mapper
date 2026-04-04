import { useFilterStore } from '../../store/filterStore'

export default function TechCommBalance() {
  const balance = useFilterStore((s) => s.techCommBalance)
  const setBalance = useFilterStore((s) => s.setTechCommBalance)

  return (
    <div>
      <h3 className="text-xs font-medium text-lumen-graphite-100 uppercase tracking-wider mb-2">
        Tech / Commercial Balance
      </h3>
      <div className="flex items-center gap-2">
        <span className="text-xs text-lumen-sky-blue-500 font-medium w-14">Tech {Math.round(balance * 100)}%</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(balance * 100)}
          onChange={(e) => setBalance(Number(e.target.value) / 100)}
          className="flex-1 h-1.5 accent-lumen-sky-blue cursor-pointer"
        />
        <span className="text-xs text-lumen-electric-yellow-100 font-medium w-16 text-right">
          Comm {Math.round((1 - balance) * 100)}%
        </span>
      </div>
    </div>
  )
}
