import { PoseMetrics } from '@/types'
import { generateFeedback } from '@/lib/pose/poseAnalysis'

interface Props {
  metrics: PoseMetrics
}

function MetricBar({ label, value, max = 100, good = true }: { label: string; value: number; max?: number; good?: boolean }) {
  const pct = Math.min((value / max) * 100, 100)
  const color = good ? (pct > 70 ? '#00ff88' : pct > 40 ? '#ffb347' : '#ff6b6b') : '#00d4ff'
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-jarvis-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function TrainingFeedbackPanel({ metrics }: Props) {
  const feedback = generateFeedback(metrics)
  return (
    <div className="glass rounded-2xl p-4 border border-jarvis-border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-jarvis-blue uppercase tracking-widest">Live Analysis</h3>
        <div className="text-2xl font-bold text-white">
          <span className={metrics.overallScore > 70 ? 'text-green-400' : metrics.overallScore > 50 ? 'text-yellow-400' : 'text-red-400'}>
            {metrics.overallScore}
          </span>
          <span className="text-slate-500 text-sm">/100</span>
        </div>
      </div>
      <div>
        <MetricBar label="Balance" value={metrics.balance} />
        <MetricBar label="Knee Bend (°)" value={metrics.kneeBend} max={180} good={false} />
        <MetricBar label="Stance Width" value={metrics.stanceWidth} max={50} good={false} />
      </div>
      <div className="space-y-2">
        {feedback.map((f, i) => (
          <div key={i} className="text-xs text-slate-300 bg-jarvis-navy/50 rounded-lg px-3 py-2 border-l-2 border-jarvis-blue">
            {f}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 italic border-t border-jarvis-border pt-3">
        AI feedback is for training support only. Always train under a qualified instructor.
      </p>
    </div>
  )
}
