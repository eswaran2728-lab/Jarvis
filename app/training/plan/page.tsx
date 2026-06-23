'use client'
import { useState, useCallback } from 'react'
import AppShell from '@/components/layout/AppShell'
import AthletePlanCard from '@/components/training/AthletePlanCard'
import { ClipboardList, RefreshCw, Trophy } from 'lucide-react'

type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Elite'

interface Exercise {
  id: string
  exercise: string
  detail: string
  difficulty: Difficulty
  tip: string
  completed: boolean
}

interface Block {
  title: string
  color: string
  exercises: Exercise[]
}

const morningPool: Omit<Exercise, 'id' | 'completed'>[] = [
  { exercise: '2.4km Run', detail: 'Target: under 12 min', difficulty: 'Medium', tip: 'Maintain a steady pace. Do not sprint early — conserve energy for the final 400m push.' },
  { exercise: '400m Sprint', detail: '4 sets · 90 sec rest', difficulty: 'Hard', tip: 'Drive your arms and keep your head still. Full recovery between sets is key for max output.' },
  { exercise: 'Jump Rope', detail: '5 min × 3 sets', difficulty: 'Medium', tip: 'Stay on the balls of your feet. Consistent rhythm builds footwork speed for Silambam.' },
  { exercise: 'Cycling', detail: '10km steady pace', difficulty: 'Easy', tip: 'Keep cadence above 80 RPM. Great for active recovery while maintaining cardio base.' },
]

const strengthPool: Omit<Exercise, 'id' | 'completed'>[] = [
  { exercise: 'Push-ups', detail: '4 sets × 25 reps', difficulty: 'Medium', tip: 'Lock your core throughout. Full range of motion — chest to ground, arms fully extended.' },
  { exercise: 'Pull-ups', detail: '3 sets × 10 reps', difficulty: 'Hard', tip: 'Dead hang at bottom, chin above bar at top. Build the pulling strength essential for stick control.' },
  { exercise: 'Sit-ups', detail: '4 sets × 30 reps', difficulty: 'Medium', tip: 'Controlled descent. A strong core anchors every Silambam strike and defensive movement.' },
  { exercise: 'Burpees', detail: '3 sets × 15 reps', difficulty: 'Hard', tip: 'Explosive jump at the top. Burpees build the conditioning needed for long sparring sessions.' },
  { exercise: 'Squats', detail: '4 sets × 20 reps', difficulty: 'Medium', tip: 'Drive through your heels. Your Silambam power is generated from the ground up.' },
  { exercise: 'Lunges', detail: '3 sets × 20 reps each leg', difficulty: 'Medium', tip: 'Front knee tracks over toes. Lunges directly translate to Silambam stepping patterns.' },
  { exercise: 'Plank', detail: '3 sets × 60 seconds', difficulty: 'Easy', tip: 'Squeeze glutes and abs. A rigid core is your foundation for all martial arts movement.' },
  { exercise: 'Diamond Push-ups', detail: '3 sets × 15 reps', difficulty: 'Hard', tip: 'Hands form a diamond shape. Targets triceps for stick-pushing and blocking power.' },
  { exercise: 'Box Jumps', detail: '3 sets × 10 reps', difficulty: 'Hard', tip: 'Soft landing, absorb impact with your legs. Develops explosive power for rapid footwork changes.' },
  { exercise: 'Mountain Climbers', detail: '3 sets × 30 reps', difficulty: 'Medium', tip: 'Drive knees to chest at speed. Builds the hip flexor strength and cardio for combat readiness.' },
]

const silambamExercises: Omit<Exercise, 'id' | 'completed'>[] = [
  { exercise: 'Basic Stance Hold', detail: '5 sets × 2 minutes', difficulty: 'Medium', tip: 'Weight evenly distributed, slight knee bend. This builds the isometric strength for your fighting base.' },
  { exercise: 'Footwork Pattern Drill', detail: '20 rounds', difficulty: 'Hard', tip: 'Box pattern first, then triangular. Precise footwork is what separates advanced practitioners.' },
  { exercise: 'Basic Strike Combo', detail: '50 reps each side', difficulty: 'Medium', tip: 'Speed is secondary to form at this stage. Perfect technique first — speed will follow with repetition.' },
  { exercise: 'Single Leg Balance', detail: '3 sets × 1 min each leg', difficulty: 'Medium', tip: 'Focus your gaze on a fixed point. Balance training directly improves your stability during combat.' },
  { exercise: 'Stick Flow Practice', detail: '10 minutes continuous', difficulty: 'Elite', tip: 'Flow state, no pausing. This is meditation in motion — let the stick become an extension of your body.' },
]

const eveningExercises: Omit<Exercise, 'id' | 'completed'>[] = [
  { exercise: 'Full Body Stretch', detail: '15 minutes', difficulty: 'Easy', tip: 'Hold each stretch 30 seconds minimum. Flexibility prevents injury and improves your kicking range.' },
  { exercise: 'Foam Rolling', detail: '10 minutes', difficulty: 'Easy', tip: 'Slow, deliberate pressure on tight spots. Releases fascia tension from today\'s training.' },
  { exercise: 'Breathing Exercises', detail: '5 minutes', difficulty: 'Easy', tip: 'Box breathing: 4 counts in, hold 4, out 4, hold 4. Activates the parasympathetic nervous system for recovery.' },
  { exercise: 'Cold Shower', detail: 'Recommended', difficulty: 'Hard', tip: 'Start warm, end cold for 60 seconds. Reduces inflammation and builds mental toughness simultaneously.' },
]

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function generatePlan(): Block[] {
  let id = 0
  const makeExercise = (e: Omit<Exercise, 'id' | 'completed'>): Exercise => ({
    ...e,
    id: String(++id),
    completed: false,
  })

  return [
    {
      title: 'Morning Cardio',
      color: 'text-orange-400 border-orange-400/30',
      exercises: pickRandom(morningPool, 2).map(makeExercise),
    },
    {
      title: 'Strength Training',
      color: 'text-yellow-400 border-yellow-400/30',
      exercises: pickRandom(strengthPool, 5).map(makeExercise),
    },
    {
      title: 'Silambam Training',
      color: 'text-orion-blue border-orion-blue/30',
      exercises: silambamExercises.map(makeExercise),
    },
    {
      title: 'Evening Recovery',
      color: 'text-green-400 border-green-400/30',
      exercises: eveningExercises.map(makeExercise),
    },
  ]
}

const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

export default function AthletePlanPage() {
  const [blocks, setBlocks] = useState<Block[]>(() => generatePlan())

  const allExercises = blocks.flatMap(b => b.exercises)
  const completed = allExercises.filter(e => e.completed).length
  const total = allExercises.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const allDone = completed === total

  const toggle = useCallback((blockIdx: number, exId: string) => {
    setBlocks(prev =>
      prev.map((block, bi) =>
        bi !== blockIdx
          ? block
          : {
              ...block,
              exercises: block.exercises.map(e =>
                e.id === exId ? { ...e, completed: !e.completed } : e
              ),
            }
      )
    )
  }, [])

  const regenerate = () => setBlocks(generatePlan())

  // SVG ring
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-violet-400/20 border border-violet-400/30">
              <ClipboardList size={22} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">ORION Athlete Plan</h1>
              <p className="text-slate-400 text-sm">{today}</p>
            </div>
          </div>
          <div className="glass rounded-xl border border-orion-border p-4">
            <p className="text-sm text-slate-300">
              <span className="text-orion-blue font-semibold">ORION:</span> Sir, here is your optimised training plan for today. Complete each session for peak performance. I have designed this programme to maximise your Silambam development.
            </p>
          </div>
        </div>

        {/* Progress ring + stats */}
        <div className="glass rounded-2xl border border-orion-border p-6 mb-6 flex items-center gap-6">
          <div className="relative flex-shrink-0">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r={r}
                fill="none"
                stroke={allDone ? '#4ade80' : '#00d4ff'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.4s ease' }}
              />
              <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill={allDone ? '#4ade80' : '#00d4ff'} fontSize="18" fontWeight="bold">
                {pct}%
              </text>
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold text-lg mb-1">{completed}/{total} Complete</div>
            <div className="text-slate-400 text-sm mb-4">
              {allDone ? 'Outstanding performance today, sir!' : `${total - completed} exercises remaining`}
            </div>
            <button
              onClick={regenerate}
              className="flex items-center gap-2 py-2 px-4 rounded-xl bg-violet-400/10 border border-violet-400/30 text-violet-400 text-sm font-semibold hover:bg-violet-400/20 transition-all"
            >
              <RefreshCw size={14} />
              Generate New Plan
            </button>
          </div>
        </div>

        {/* All done banner */}
        {allDone && (
          <div className="glass rounded-2xl border border-green-400/30 bg-green-400/5 p-5 mb-6 flex items-center gap-4">
            <Trophy size={32} className="text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-green-400 font-bold text-lg">Exceptional Work, Sir!</p>
              <p className="text-slate-300 text-sm mt-1">ORION: You have completed every session today. Your discipline and commitment are the hallmarks of a champion. Rest well — tomorrow we push further.</p>
            </div>
          </div>
        )}

        {/* Training blocks */}
        <div className="space-y-6">
          {blocks.map((block, bi) => (
            <div key={bi} className="glass rounded-2xl border border-orion-border p-5">
              <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${block.color.split(' ')[0]}`}>
                {block.title}
              </h2>
              <div className="space-y-3">
                {block.exercises.map(ex => (
                  <AthletePlanCard
                    key={ex.id}
                    exercise={ex.exercise}
                    detail={ex.detail}
                    difficulty={ex.difficulty}
                    tip={ex.tip}
                    completed={ex.completed}
                    onToggle={() => toggle(bi, ex.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
