import { Card } from '@shared/ui'
import { Newspaper, Zap } from 'lucide-react'

export function StatsBar({ articleCount, eventCount }) {
  return (
    <Card className="mb-8 bg-black/20 backdrop-blur-sm border-white/10 shadow-lg shadow-black/30">
      <div className="p-4 flex justify-around items-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-blue-300">
            <Zap className="h-5 w-5" />
            <span className="text-2xl font-bold">{eventCount.toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Synthesized Events
          </p>
        </div>
        <div className="h-12 w-px bg-slate-700"></div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-slate-300">
            <Newspaper className="h-5 w-5" />
            <span className="text-2xl font-bold">{articleCount.toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Raw Articles</p>
        </div>
      </div>
    </Card>
  )
}
