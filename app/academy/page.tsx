'use client'
import AppShell from '@/components/layout/AppShell'
import { useState } from 'react'
import { ChevronDown, ChevronUp, ShieldAlert, Swords, BookOpen, Star, Target } from 'lucide-react'

type Section = { title: string; items: { name: string; desc: string; tips?: string[] }[] }

const sections: { icon: React.ElementType; color: string; label: string; content: Section[] }[] = [
  {
    icon: Target, color: '#00d4ff', label: 'Foundation',
    content: [
      {
        title: 'Foundation',
        items: [
          { name: 'Basic Stance (Nilai)', desc: 'Stand feet shoulder-width apart, knees slightly bent, weight centered. Keep back straight, stick loosely gripped.', tips: ['Do not lock your knees', 'Avoid leaning forward', 'Relax your grip'] },
          { name: 'Footwork (Kaal Padam)', desc: 'Move in all 4 directions while maintaining stance. Lead with front foot forward, never cross feet.', tips: ['Keep weight low', 'Do not look down', 'Train slow before fast'] },
          { name: 'Stick Holding Posture', desc: 'Hold at lower third from base. Grip firm but not rigid. Wrist relaxed for fluid movement.', tips: ['Do not hold too high or too low', 'Avoid white-knuckle grip', 'Elbow should not flare out'] },
          { name: 'Basic Strike Posture', desc: 'Generate power from hips upward. Keep eyes on target. Follow through and return to guard immediately.', tips: ['Power from ground up — legs, hips, torso, stick', 'Never lose eye contact with target'] },
          { name: 'Defense Posture', desc: 'Maintain distance. Stick at 45°. Weight slightly back. Block with middle section of stick, not the tip.', tips: ['Stay mobile — rigid guard is slow', 'Block creates counter opportunity'] },
          { name: 'Balance Control', desc: 'Low center of gravity. Both feet always in contact-ready position. Recover balance after every movement.', tips: ['Train single-leg stands daily', 'Integrate balance drills into warm-up'] },
          { name: 'Timing and Rhythm', desc: 'Attack at the peak of opponent\'s guard opening. Counter in the gap between their attack and recovery.', tips: ['Watch the opponent, not their stick', 'Rhythm comes before speed'] },
        ],
      },
    ],
  },
  {
    icon: Swords, color: '#f97316', label: 'Combat Rules',
    content: [
      {
        title: 'Scoring & Legal Targets',
        items: [
          { name: 'Legal Targets', desc: 'Chest / Stomach / Shoulders / Outer Thigh / Outer Calf. All must be controlled, non-injurious contact.' },
          { name: 'Illegal Actions', desc: 'Head strikes, face contact, back-of-knee, foot strikes (below ankle), grabs, pushes, unsportsmanlike conduct.' },
          { name: 'Scoring Rules', desc: 'Point awarded when stick tip contacts a legal target zone cleanly. Excessive force results in penalty.' },
          { name: 'Referee Signals', desc: 'Referee signals point with raised hand toward scoring fighter. Stops bout for safety or rule violations.' },
          { name: 'Safety Rules', desc: 'Protective equipment mandatory. Any dangerous technique immediately disqualified. Fighter safety is priority.' },
          { name: 'Poruthal Combat', desc: 'Formal sparring format. Fighters begin at distance. Point system. Referee controlled.' },
          { name: 'Thanitiramai', desc: 'Individual technique demonstration. Judged on form, control, and execution quality.' },
        ],
      },
    ],
  },
  {
    icon: Star, color: '#a855f7', label: 'Skill Library',
    content: [
      {
        title: 'Attacks',
        items: [
          { name: 'Usi (Injection Strike)', desc: 'Straight-line tip entry directly to chest/center. Fastest single attack. Requires clear centerline opening.', tips: ['Guard must be open on centerline', 'Execute and retreat immediately'] },
          { name: 'Hook / Reverse Hook', desc: 'C-shaped arc to shoulder. Hook goes one direction, Reverse Hook mirrors it.', tips: ['Path must curve — not a straight strike', 'Compact arc is harder to block'] },
          { name: 'U Strike / Reverse U Strike', desc: 'U-shaped path — enter from one side, sweep under, exit on opposite side, touch upper body.', tips: ['Enter low, exit high', 'Reverse = mirror U direction'] },
          { name: 'Sweep', desc: 'Low-line attack to outer calf or outer thigh from Bavalai. Both hands together.', tips: ['NEVER hit the foot — illegal', 'Both hands must be together at strike'] },
          { name: 'Slide', desc: 'Trap → U entry → upper touch → immediately slide straight down to lower touch. One continuous flow.', tips: ['No pause between upper and lower touch', 'Fake must be convincing first'] },
          { name: 'Zip / Reverse Zip', desc: 'Straight double-touch: any legal target → any other legal target. Direct, no curve.', tips: ['Zip Speed = both touches under 200ms', 'Both hands together throughout'] },
        ],
      },
      {
        title: 'Counters & Defence',
        items: [
          { name: 'Echo', desc: 'Intercept → Redirect → Immediate Counter. NOT passive blocking. Advance rear leg, do NOT retreat.', tips: ['Stepping backward = failed Echo', 'Counter must come immediately after intercept'] },
          { name: 'Trap (Acha)', desc: 'Fake toward one target to pull opponent guard, then instantly strike the open target.', tips: ['Hands apart during fake, together during real strike', 'Transition must be deceptive and fast'] },
          { name: 'Active Bavalai Defence', desc: 'Stick stays continuously moving (Bavalai) while maintaining body centerline protection.', tips: ['Never stop Bavalai under pressure', 'Centerline must always be covered'] },
          { name: 'Emergency Block', desc: 'Direct intercept of fast incoming attack. Block before opponent\'s stick reaches target.', tips: ['Time the block to opponent\'s wrist, not stick tip', 'Follow immediately with counter'] },
        ],
      },
      {
        title: 'Global Principles',
        items: [
          { name: 'Bavalai', desc: '360° continuous spinning stick movement. Foundation of all Silambam combat. Creates opportunities and defence.', tips: ['Compact Bavalai is faster', 'Rhythm score matters — consistent speed beats fast but uneven'] },
          { name: 'Gap', desc: 'Reading opponent stick position during Bavalai. Stick LOW = upper body open. Stick HIGH = lower body open.', tips: ['Attack in the window — gaps close fast', 'Counter risk is LOW when gap is clear'] },
          { name: 'Retreat', desc: 'Immediate backward movement after every attack or touch. Secures point and prevents counter.', tips: ['ALWAYS retreat after scoring', 'Stick must stay active during retreat', 'Return to Bavalai immediately'] },
        ],
      },
    ],
  },
  {
    icon: BookOpen, color: '#00ff88', label: 'Advanced',
    content: [
      {
        title: 'Advanced Techniques',
        items: [
          { name: 'Sandai Murai', desc: 'Formal combat sequence training. Structured attack-defence patterns practised with partner.' },
          { name: 'Silambam Sandai', desc: 'Full sparring with Silambam rules. Point-based competitive format.' },
          { name: 'Madu', desc: 'Deer horn weapon. Defensive blocking weapon with close-range application.' },
          { name: 'Chedikuchi', desc: 'Short stick variant of Silambam. Faster movement, closer range.' },
          { name: 'Katti Pidi', desc: 'Knife holding grip technique. Foundation for blade-based Silambam systems.' },
          { name: 'Muffler Pidi', desc: 'Cloth wrap defensive technique. Close-range entrapment method.' },
          { name: 'Spear Demonstration', desc: 'Long-range weapon extension. Adds reach and changes timing entirely.' },
        ],
      },
    ],
  },
]

function AccordionSection({ section, color }: { section: { title: string; items: { name: string; desc: string; tips?: string[] }[] }; color: string }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${color}30` }}>
      <button className="w-full flex items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(v => !v)}
        style={{ background: `${color}08` }}>
        <span className="font-bold text-sm text-white">{section.title}</span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && (
        <div className="divide-y divide-slate-800">
          {section.items.map(item => (
            <div key={item.name} className="bg-slate-900/60">
              <button className="w-full flex items-center justify-between px-4 py-3 text-left"
                onClick={() => setExpanded(expanded === item.name ? null : item.name)}>
                <span className="text-sm font-semibold text-white">{item.name}</span>
                {expanded === item.name ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
              </button>
              {expanded === item.name && (
                <div className="px-4 pb-4 space-y-2">
                  <p className="text-slate-300 text-xs leading-relaxed">{item.desc}</p>
                  {item.tips && item.tips.length > 0 && (
                    <div className="space-y-1">
                      {item.tips.map((t, i) => (
                        <p key={i} className="text-[11px]" style={{ color }}>{`→ ${t}`}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AcademyPage() {
  const [activeTab, setActiveTab] = useState(0)
  const tab = sections[activeTab]

  return (
    <AppShell>
      <div className="p-3 md:p-5 max-w-2xl mx-auto w-full pb-24">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white">Academy</h1>
          <p className="text-slate-400 text-xs mt-0.5">Silambam knowledge library</p>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3 mb-4">
          <ShieldAlert size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400">AI analysis is for training feedback only. Always train under qualified supervision.</p>
        </div>

        {/* Tab row */}
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
          {sections.map((s, i) => {
            const Icon = s.icon
            return (
              <button key={s.label} onClick={() => setActiveTab(i)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all border ${activeTab === i ? 'border-opacity-60 text-white' : 'border-slate-700 text-slate-400 hover:text-white'}`}
                style={activeTab === i ? { borderColor: s.color, background: `${s.color}15`, color: s.color } : {}}>
                <Icon size={14} />
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="space-y-3">
          {tab.content.map(section => (
            <AccordionSection key={section.title} section={section} color={tab.color} />
          ))}
        </div>
      </div>
    </AppShell>
  )
}
