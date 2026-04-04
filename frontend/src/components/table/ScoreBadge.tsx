export default function ScoreBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
  let bg: string
  if (score >= 75) bg = 'bg-lumen-electric-yellow text-lumen-black'
  else if (score >= 50) bg = 'bg-lumen-sky-blue text-lumen-black'
  else if (score >= 25) bg = 'bg-lumen-sky-blue-400 text-white'
  else bg = 'bg-lumen-concrete text-white'

  const sizeClass = size === 'lg' ? 'px-2.5 py-1 text-sm font-medium' : 'px-1.5 py-0.5 text-xs'

  return (
    <span className={`inline-block rounded ${bg} ${sizeClass} font-mono`}>
      {score.toFixed(1)}
    </span>
  )
}
