import AppShell from '@/components/layout/AppShell'
import SilambamSkillCard from '@/components/training/SilambamSkillCard'

const silambamSkills = [
  {
    id: '1',
    name: 'Basic Stance (Nilai)',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Slightly bend your knees for stability',
      'Keep your back straight and head upright',
      'Hold the stick loosely but firmly in your dominant hand',
      'Keep your non-dominant arm raised for balance',
    ],
    mistakes: ['Locking knees straight', 'Leaning forward too much', 'Gripping stick too tightly', 'Uneven foot placement'],
    feedback: 'Sir, a strong foundation begins with your stance. Practice this for 10 minutes daily before any other technique.',
    homework: 'Hold the basic stance for 3 sets of 2 minutes each. Focus on keeping your weight centered.',
  },
  {
    id: '2',
    name: 'Footwork (Kaal Padam)',
    instructions: [
      'Practice moving in all 4 directions maintaining your stance',
      'Lead with the front foot when moving forward',
      'Keep your center of gravity low during transitions',
      'Avoid crossing your feet',
      'Practice slow, then increase speed gradually',
    ],
    mistakes: ['Moving too fast before mastering the pattern', 'Crossing feet during movement', 'Losing stance while moving', 'Looking down at feet'],
    feedback: 'Sir, footwork is the foundation of Silambam. Your balance during movement will determine your effectiveness in practice.',
    homework: 'Practice the 4-direction footwork pattern 20 times each direction. Do 3 rounds.',
  },
  {
    id: '3',
    name: 'Stick Holding Posture',
    instructions: [
      'Hold the stick at the lower third from the base',
      'Grip should be firm but not rigid',
      'Wrist should be relaxed to allow fluid movement',
      'Non-dominant hand position at 45 degree angle',
      'Stick should be parallel to your body line',
    ],
    mistakes: ['Holding too high or too low on the stick', 'White-knuckle grip reducing flexibility', 'Wrist locked stiff', 'Elbow flaring outward'],
    feedback: 'Sir, your stick grip is the connection to your technique. A relaxed grip produces faster, more fluid strikes.',
    homework: 'Practice wrist rotation exercises with the stick for 5 minutes. 10 clockwise, 10 counterclockwise.',
  },
  {
    id: '4',
    name: 'Basic Strike Posture',
    instructions: [
      'Begin from basic stance position',
      'Generate power from your hips, not just arms',
      'Keep your eyes on the target at all times',
      'Follow through with the strike direction',
      'Return to guard position after each strike',
    ],
    mistakes: ['Using only arm strength', 'Losing balance during strike', 'Taking eyes off target', 'Not returning to guard'],
    feedback: 'Sir, power comes from the ground up — through your legs, hips, torso, and finally the stick. Each segment adds energy.',
    homework: 'Practice 50 basic strikes against a safe padded target or in the air. Focus on hip rotation.',
  },
  {
    id: '5',
    name: 'Defense Posture',
    instructions: [
      'Maintain distance from opponent/target',
      'Keep stick in ready position at 45 degrees',
      'Weight slightly on back foot for mobility',
      'Eyes tracking the incoming strike path',
      'Block with the middle section of the stick',
    ],
    mistakes: ['Standing too close', 'Rigid defensive position', 'Late reaction from poor stance', 'Blocking with tip of stick'],
    feedback: 'Sir, defense is equally important as offense in Silambam. A good guard protects you and opens counter opportunities.',
    homework: 'Practice block and step-back drill 30 times each side. Focus on fluid movement.',
  },
  {
    id: '6',
    name: 'Balance Control',
    instructions: [
      'Practice single-leg stands to build balance',
      'Integrate balance exercises into your daily routine',
      'Use a mirror or camera to check your alignment',
      'Practice slow-motion techniques to develop control',
      'Core strengthening exercises support balance greatly',
    ],
    mistakes: ['Skipping balance training', 'Rushing through drills', 'Ignoring core strength', 'Poor breathing during practice'],
    feedback: 'Sir, your balance score from last session was 72%. Small improvements daily compound significantly over weeks.',
    homework: 'Single-leg balance: 3 sets of 30 seconds each leg. Practice with eyes closed for advanced challenge.',
  },
  {
    id: '7',
    name: 'Timing and Rhythm',
    instructions: [
      'Practice to rhythmic counting or metronome',
      'Start slow, build speed only after mastering the pattern',
      'Listen to traditional Silambam music while practicing',
      'Practice with a training partner for realistic timing',
      'Record yourself to review your timing accuracy',
    ],
    mistakes: ['Practicing too fast too soon', 'Ignoring rhythm in practice', 'Not using counting', 'Irregular breathing patterns'],
    feedback: 'Sir, Silambam has a musical rhythm to it. When your technique flows with natural timing, efficiency improves dramatically.',
    homework: 'Practice a basic 8-count pattern to a metronome at 60 BPM. After mastery, increase to 80 BPM.',
  },
]

export default function SilambamPage() {
  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <div className="text-orion-blue text-xs uppercase tracking-widest mb-1">Training Mode</div>
          <h1 className="text-2xl font-bold text-white">Silambam Coach</h1>
          <p className="text-slate-400 text-sm mt-1">Traditional Tamil martial art training guide</p>
        </div>

        <div className="glass rounded-2xl border border-orion-blue/30 p-4 mb-6">
          <p className="text-sm text-slate-300 leading-relaxed">
            <span className="text-orion-blue font-semibold">Sir, ORION Silambam coach is ready.</span> Silambam is a traditional martial art from Tamil Nadu, India. Practice each skill category below with focus and discipline. Tap any category to expand detailed instructions.
          </p>
        </div>

        <div className="space-y-3">
          {silambamSkills.map(skill => (
            <SilambamSkillCard key={skill.id} skill={skill} />
          ))}
        </div>

        <p className="text-xs text-slate-500 text-center mt-8">
          AI guidance is for educational purposes only. Always practice under a qualified Silambam instructor.
        </p>
      </div>
    </AppShell>
  )
}
