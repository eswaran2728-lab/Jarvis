import AppShell from '@/components/layout/AppShell'
import ProgressCard from '@/components/progress/ProgressCard'
import { mockTrainingSessions, mockSkills } from '@/lib/mockData'

export default function ProgressPage() {
  const avg = Math.round(mockTrainingSessions.reduce((a, s) => a + s.score, 0) / mockTrainingSessions.length)
  const best = Math.max(...mockTrainingSessions.map(s => s.score))

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Training Progress</h1>
          <p className="text-slate-400 text-sm mt-1">Your performance over time</p>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="glass rounded-xl border border-jarvis-border p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{best}</div>
            <div className="text-xs text-slate-400 mt-1">Best Score</div>
          </div>
          <div className="glass rounded-xl border border-jarvis-border p-4 text-center">
            <div className="text-3xl font-bold text-jarvis-blue">{avg}</div>
            <div className="text-xs text-slate-400 mt-1">Average Score</div>
          </div>
        </div>

        {/* Score history */}
        <div className="glass rounded-2xl border border-jarvis-border p-4 mb-6">
          <h2 className="text-xs text-jarvis-blue uppercase tracking-widest mb-4">Session History</h2>
          {mockTrainingSessions.map(session => (
            <div key={session.id} className="flex items-center gap-4 py-3 border-b border-jarvis-border last:border-0">
              <div className={`text-xl font-bold w-12 text-center ${session.score >= 80 ? 'text-green-400' : session.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {session.score}
              </div>
              <div className="flex-1">
                <div className="text-sm text-white">{session.mode}</div>
                <div className="text-xs text-slate-400">{session.date} · {session.duration} min</div>
                <div className="text-xs text-slate-500 mt-0.5">{session.feedback[0]}</div>
              </div>
              {/* Mini score bar */}
              <div className="w-20 h-2 bg-jarvis-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${session.score}%`,
                    background: session.score >= 80 ? '#4ade80' : session.score >= 60 ? '#facc15' : '#f87171'
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div className="mb-6">
          <h2 className="text-xs text-jarvis-blue uppercase tracking-widest mb-4">Skill Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mockSkills.map(skill => <ProgressCard key={skill.id} skill={skill} />)}
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl border border-green-400/20 p-4">
            <h3 className="text-xs text-green-400 uppercase tracking-widest mb-3">Strengths</h3>
            {mockSkills.filter(s => s.level >= 4).map(s => (
              <div key={s.id} className="text-sm text-slate-300 flex gap-2 mb-1"><span className="text-green-400">✓</span>{s.name}</div>
            ))}
          </div>
          <div className="glass rounded-xl border border-red-400/20 p-4">
            <h3 className="text-xs text-red-400 uppercase tracking-widest mb-3">Improve</h3>
            {mockSkills.filter(s => s.level <= 2).map(s => (
              <div key={s.id} className="text-sm text-slate-300 flex gap-2 mb-1"><span className="text-red-400">!</span>{s.name}</div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
