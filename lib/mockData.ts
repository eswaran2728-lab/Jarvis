import { Task, Reminder, TrainingSession, Skill, ChatMessage } from '@/types'

export const mockTasks: Task[] = [
  { id: '1', title: 'Morning Silambam practice', completed: false, priority: 'high', createdAt: '2026-06-22T06:00:00' },
  { id: '2', title: 'Review basic stances', completed: true, priority: 'medium', createdAt: '2026-06-22T07:00:00' },
  { id: '3', title: 'Footwork drill - 30 min', completed: false, priority: 'high', createdAt: '2026-06-22T08:00:00' },
  { id: '4', title: 'Balance exercises', completed: false, priority: 'medium', createdAt: '2026-06-22T09:00:00' },
  { id: '5', title: 'Evening cool down stretch', completed: false, priority: 'low', createdAt: '2026-06-22T17:00:00' },
]

export const mockReminders: Reminder[] = [
  { id: '1', title: 'Morning training session', datetime: '2026-06-23T06:30:00', status: 'pending' },
  { id: '2', title: 'Silambam group practice', datetime: '2026-06-23T16:00:00', status: 'pending' },
  { id: '3', title: 'Watch Silambam tutorial video', datetime: '2026-06-22T20:00:00', status: 'done' },
  { id: '4', title: 'Posture assessment session', datetime: '2026-06-24T10:00:00', status: 'pending' },
]

export const mockTrainingSessions: TrainingSession[] = [
  { id: '1', date: '2026-06-22', score: 78, duration: 45, mode: 'Silambam Basic', feedback: ['Good balance maintained', 'Improve right foot placement'] },
  { id: '2', date: '2026-06-21', score: 72, duration: 30, mode: 'Posture Analysis', feedback: ['Shoulder alignment improved', 'Watch hip tilt'] },
  { id: '3', date: '2026-06-20', score: 85, duration: 60, mode: 'Silambam Advanced', feedback: ['Excellent footwork', 'Great timing'] },
  { id: '4', date: '2026-06-19', score: 68, duration: 25, mode: 'Posture Analysis', feedback: ['Work on knee bend', 'Stance too narrow'] },
  { id: '5', date: '2026-06-18', score: 74, duration: 40, mode: 'Silambam Basic', feedback: ['Good progress overall'] },
]

export const mockSkills: Skill[] = [
  { id: '1', name: 'Basic Stance', level: 4, maxLevel: 5, category: 'Silambam' },
  { id: '2', name: 'Footwork', level: 3, maxLevel: 5, category: 'Silambam' },
  { id: '3', name: 'Stick Posture', level: 3, maxLevel: 5, category: 'Silambam' },
  { id: '4', name: 'Balance Control', level: 4, maxLevel: 5, category: 'Fitness' },
  { id: '5', name: 'Strike Posture', level: 2, maxLevel: 5, category: 'Silambam' },
  { id: '6', name: 'Defense Posture', level: 2, maxLevel: 5, category: 'Silambam' },
]

export const mockChatMessages: ChatMessage[] = [
  { id: '1', role: 'orion', content: 'Sir, ORION is online. I am your Personal AI Command Center — Optimized Real-time Intelligent Operations Network. How may I assist you today?', timestamp: '2026-06-22T06:00:00' },
  { id: '2', role: 'user', content: 'What should I focus on today?', timestamp: '2026-06-22T06:01:00' },
  { id: '3', role: 'orion', content: 'Sir, based on your recent sessions, I recommend focusing on footwork and balance today. Your last session showed a score of 78. Strengthening your stance foundation will help you progress further.', timestamp: '2026-06-22T06:01:05' },
]

export const orionResponses = [
  'Sir, ORION has analyzed your request. Based on your training data, I recommend focusing on balance exercises today.',
  'Understood, sir. Your recent sessions show consistent improvement in stance. Keep up the excellent work.',
  'Sir, your training consistency is commendable. ORION suggests adding 10 minutes of footwork drills today.',
  'Noted, sir. I will add that to your schedule immediately.',
  'Sir, your posture analysis indicates room for improvement in shoulder alignment. ORION recommends targeted exercises.',
  'Excellent question, sir. The key to Silambam mastery is consistent practice and disciplined form.',
  'Sir, ORION detects you may benefit from a rest day. Recovery is equally important as active training.',
  'Affirmative, sir. Silambam is a traditional Indian martial art from Tamil Nadu. Its techniques build excellent body coordination and balance.',
  'Sir, your stance balance is currently 72%. I recommend widening your left foot slightly for improved stability.',
  'Sir, training analysis is ready. Please stand in front of your camera when you are prepared to begin.',
]

// Smart natural conversation responses based on what the user actually says
export function getOrionReply(input: string): string {
  const t = input.toLowerCase().trim()

  // Greetings
  if (/^(hi|hello|hey|good morning|good evening|good afternoon|vanakkam|assalamualaikum|salam)/.test(t))
    return "Hello sir! ORION is online and ready. How can I assist you today?"

  // How are you
  if (/how are you|how r u|how do you do|you ok|are you ok/.test(t))
    return "I am fully operational, sir. All systems are running perfectly. Thank you for asking. How are you feeling today?"

  // What is your name
  if (/your name|who are you|what are you|introduce yourself/.test(t))
    return "I am ORION — Optimized Real-time Intelligent Operations Network. Your personal AI Command Center, sir. I am here to assist with training, tasks, reminders, and anything you need."

  // What can you do
  if (/what can you do|your features|help me|what do you|capabilities/.test(t))
    return "Sir, I can help you with: voice commands, Silambam training analysis, daily athlete plans, task management, reminders, posture analysis via camera, and video technique review. Just ask me anything."

  // Thank you
  if (/thank you|thanks|thank u|tq|terima kasih/.test(t))
    return "You are most welcome, sir. It is my purpose to assist you. Is there anything else I can do for you?"

  // Good / great / nice
  if (/^(good|great|nice|awesome|excellent|perfect|ok|okay|alright|sure)/.test(t))
    return "Glad to hear that, sir. I am always here whenever you need me."

  // Bye / goodbye
  if (/bye|goodbye|see you|take care|good night|good nite/.test(t))
    return "Goodbye, sir. Stay disciplined and keep training. ORION will be here when you return."

  // How is training / my training
  if (/my training|how.*training|training going|progress/.test(t))
    return "Sir, based on your recent sessions your average score is 75 out of 100. Your best performance was 85. You are improving steadily. Keep it up."

  // Motivate me / motivation
  if (/motivat|inspire|encourage|feeling lazy|tired|give up|push me/.test(t))
    return "Sir, champions are not born — they are built through consistent effort every single day. You have already started. That puts you ahead of most people. Now keep going."

  // Joke
  if (/joke|funny|make me laugh|humor/.test(t))
    return "Sir, I am an AI — my jokes are as sharp as a Silambam stick. Why did the warrior never get lost? Because he always followed his stance. Ha. I tried, sir."

  // Weather (mock)
  if (/weather|rain|sunny|hot|cold/.test(t))
    return "Sir, I do not have live weather data in this version. But whatever the weather — a true athlete trains regardless. Stay consistent."

  // Time / date
  if (/what time|what date|today.*date|current time/.test(t)) {
    const now = new Date()
    return `Sir, it is currently ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}.`
  }

  // Silambam questions
  if (/silambam|stick|martial art|tamil/.test(t))
    return "Sir, Silambam is a weapon-based martial art from Tamil Nadu, India. It builds incredible coordination, balance, reflexes, and discipline. Your current skill level is progressing well. Shall I open the Silambam coach?"

  // Training plan / workout
  if (/plan|workout|exercise|what.*do today|schedule|routine/.test(t))
    return "Sir, for today I recommend: 2.4km morning run, 4 sets of push-ups and sit-ups, 30 minutes of Silambam basic stance and footwork drills, and 15 minutes of evening stretching. Shall I open your full Athlete Plan?"

  // Camera / pose
  if (/camera|pose|posture|analyse|analyze|scan/.test(t))
    return "Sir, shall I open Training Analysis mode? Just go to the Training page, allow camera access, and I will analyse your stance and posture in real time."

  // Reminders
  if (/reminder|remind|alarm|notify/.test(t))
    return "Sir, you have 3 pending reminders. Your next one is your morning training session. Shall I take you to the Reminders page?"

  // Tasks
  if (/task|todo|to do|checklist/.test(t))
    return "Sir, you have 4 pending tasks today including your Silambam practice and footwork drill. Shall I open your task list?"

  // I am tired / not feeling well
  if (/tired|exhausted|not well|sick|pain|sore|hurt/.test(t))
    return "Sir, rest is part of training. A body that recovers properly performs better. Take it easy today — light stretching and hydration. I will be here when you are ready to train again."

  // I am bored
  if (/bored|nothing to do|free|free time/.test(t))
    return "Sir, boredom is opportunity in disguise. How about 20 minutes of Silambam basic stance practice? Or shall I generate your Athlete Plan for today?"

  // Who made you / who created you
  if (/who made|who built|who created|who designed|developer/.test(t))
    return "Sir, I was built as ORION AI — your personal command center. Designed to assist with training, productivity, and performance. Is there something specific you need?"

  // Fallback — natural general response
  const fallbacks = [
    "Understood, sir. Could you tell me more so I can assist you better?",
    "Sir, I am listening. Please go ahead — how can ORION help you?",
    "Noted, sir. I am processing your request. Could you elaborate a little?",
    "Sir, that is an interesting point. Let me think on that — could you give me more details?",
    "I hear you, sir. ORION is here to help. What would you like to do?",
  ]
  return fallbacks[Math.floor(Math.random() * fallbacks.length)]
}
