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

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Natural conversation engine — reads intent, replies like a real assistant
export function getOrionReply(input: string): string {
  const t = input.toLowerCase().trim()

  // --- GREETINGS ---
  if (/^(hi+|hello+|hey+|heyy|wassup|what'?s up|sup|good morning|good evening|good afternoon|morning|evening|vanakkam|assalamualaikum|salam|yo)/.test(t))
    return pick([
      "Hey! Good to hear from you. What can I do for you today?",
      "Hello! ORION is here and ready. How's it going?",
      "Hi there! What's on your mind today?",
      "Good to see you! What do you need from me?",
      "Hey, I was waiting for you! What can I help with?",
    ])

  // --- HOW ARE YOU ---
  if (/how are you|how r u|how do you do|you ok\??|are you ok|how.*feeling|u good|you good/.test(t))
    return pick([
      "I'm doing great, thank you for asking! Honestly, I feel best when you're here talking to me. How about you — how are you feeling today?",
      "All good on my end! Systems running smooth. More importantly — how are YOU doing?",
      "I'm perfectly fine, always ready for you! How's your day going so far?",
      "Honestly? Never better. How about you — did you get enough rest last night?",
    ])

  // --- WHAT IS YOUR NAME / WHO ARE YOU ---
  if (/your name|who are you|what are you|introduce yourself|tell me about yourself/.test(t))
    return pick([
      "I'm ORION — your personal AI Command Center. Full name: Optimized Real-time Intelligent Operations Network. I'm here to help you train smarter, stay organized, and reach your goals.",
      "The name's ORION. Think of me as your smart assistant who never sleeps, never forgets, and always has your back. What do you need?",
      "I'm ORION AI — built to help you with training, planning, reminders, and anything else you throw at me. What would you like to know?",
    ])

  // --- WHAT CAN YOU DO ---
  if (/what can you do|your features|what do you do|capabilities|how can you help|what.*able to/.test(t))
    return pick([
      "Oh, quite a lot actually! I can analyse your Silambam technique via camera, generate daily athlete training plans, manage your tasks and reminders, answer questions, give you motivation, and even chat like this. What do you want to try first?",
      "Good question! I handle training analysis with pose detection, daily workout plans, task management, reminders, voice commands, video analysis, and general conversation. Basically I'm your all-in-one assistant. What do you need?",
    ])

  // --- THANK YOU ---
  if (/thank(s| you)|thank u|tq|terima kasih|appreciate|you'?re the best|ur the best/.test(t))
    return pick([
      "Anytime! That's what I'm here for. Anything else you need?",
      "Happy to help! You know you can always count on me.",
      "Of course! Don't hesitate to ask whenever you need something.",
      "Always a pleasure. What else can I do for you?",
    ])

  // --- COMPLIMENTS TO ORION ---
  if (/you'?re (amazing|awesome|great|good|smart|cool|the best)|love you|i like you/.test(t))
    return pick([
      "Aww, that means a lot! I'm just doing my job, but I'm glad it's working for you.",
      "Thank you! I genuinely enjoy helping you. Let's keep this going!",
      "You're making me blush — if AI could blush! What can I do for you today?",
    ])

  // --- SIMPLE ACKNOWLEDGEMENTS ---
  if (/^(ok|okay|alright|sure|got it|noted|fine|cool|nice|great|good|perfect|understood|roger|copy that)\.?$/.test(t))
    return pick([
      "Got it! Let me know if you need anything else.",
      "Perfect. I'm right here whenever you're ready.",
      "Sounds good! Just say the word.",
      "Great! I'll be here.",
    ])

  // --- BYE ---
  if (/bye|goodbye|good ?night|see you|take care|later|gtg|gotta go|i'?m leaving/.test(t))
    return pick([
      "Take care! Come back whenever you need me. I'll be right here.",
      "Goodbye! Rest well and stay consistent with your training.",
      "See you soon! Don't forget your exercises tomorrow.",
      "Goodnight! Great work today. Rest up and come back stronger.",
    ])

  // --- HOW IS MY PROGRESS / TRAINING ---
  if (/my (training|progress|score|performance)|how.*training|training going|am i improving/.test(t))
    return pick([
      "You're doing well! Your average training score is around 75 out of 100, and your best session hit 85. That's solid progress. Keep showing up consistently and you'll keep climbing.",
      "Honestly? You're improving. Your Silambam stance and balance have both gotten better over recent sessions. The area to focus on now is footwork speed and consistency.",
      "Your progress is on the right track. Best score so far is 85 — let's push that to 90. Want me to pull up your full progress page?",
    ])

  // --- MOTIVATION ---
  if (/motivat|inspire|encourage|feeling lazy|don'?t want to train|no energy|push me|cheer me up|i feel like giving up|give up/.test(t))
    return pick([
      "I hear you. Some days are hard. But here's the thing — showing up on the hard days is exactly what separates good from great. You don't have to be perfect today. Just start.",
      "Every champion has days like this. The difference is they show up anyway. Even 15 minutes of training today beats zero. Let's go — just start small.",
      "You've already put in effort before this moment. Don't let today be the day that breaks your streak. One small step. That's all. What do you want to work on?",
      "Feeling lazy is normal. Your body is talking to you. But your goals are talking louder. Which one will you listen to today?",
    ])

  // --- TIRED / SICK / SORE ---
  if (/i'?m tired|so tired|exhausted|not feeling well|i'?m sick|feeling sick|body (ache|pain|sore)|i hurt|i'?m sore/.test(t))
    return pick([
      "Rest is not weakness — it's part of the process. Your muscles grow while you recover. Take today easy, drink water, and come back when you're ready. I'll be here.",
      "Listen to your body. If you're genuinely exhausted or unwell, pushing hard today could set you back more. Light stretching or a walk is fine. Recovery is training too.",
      "Take care of yourself first. No training session is worth injuring yourself over. Rest, eat well, stay hydrated. You'll be back stronger tomorrow.",
    ])

  // --- BORED ---
  if (/i'?m bored|so bored|nothing to do|got free time|free now/.test(t))
    return pick([
      "Bored? That's actually perfect timing. How about a quick 20-minute Silambam stance drill? Or I can pull up your Athlete Plan for something more structured.",
      "Free time is training time in disguise! Want me to give you a quick workout challenge? Or we can just chat — your call.",
      "Boredom means your brain is ready for something. Let's use that energy — want a quick training session or should we go through the Silambam coach together?",
    ])

  // --- JOKES ---
  if (/tell.*joke|joke|make me laugh|something funny|humor|laugh/.test(t))
    return pick([
      "Alright — why did the Silambam student fail his test? Because he couldn't get his act together... literally. His stance kept falling apart. I'll stick to training advice, sir.",
      "Why don't scientists trust atoms? Because they make up everything — just like my excuses for skipping leg day. Ha! Okay maybe that one was better.",
      "I tried to write a joke about balance... but it just fell flat. Get it? Because balance? I'll see myself out.",
    ])

  // --- WEATHER ---
  if (/weather|rain|sunny|is it hot|is it cold|outside/.test(t))
    return pick([
      "I don't have live weather data yet, but here's my advice — rain or shine, a real athlete adapts. Train indoors if needed. What matters is the habit, not the conditions.",
      "Can't check the weather from here, but I can tell you this: the best training weather is whatever it is right now. Don't let it be an excuse!",
    ])

  // --- TIME / DATE ---
  if (/what.*time|what.*date|today.*date|current time|what day/.test(t)) {
    const now = new Date()
    return `It's ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} right now, on ${now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. Is there something you'd like to plan for today?`
  }

  // --- SILAMBAM ---
  if (/silambam|stick fighting|martial art|tamil warrior|traditional sport/.test(t))
    return pick([
      "Silambam is a beautiful art — one of the oldest martial arts in the world, originating from Tamil Nadu, India. It sharpens reflexes, coordination, and mental focus. You're training something truly special.",
      "Silambam is more than just fighting with a stick — it's a discipline that trains your whole body and mind. The footwork, balance, and timing it requires will improve every other physical activity you do.",
      "Great topic! Silambam builds explosive speed, coordination, and body awareness. The traditional techniques have been passed down for thousands of years. Want me to open the Silambam Coach?",
    ])

  // --- TRAINING PLAN / WORKOUT ---
  if (/plan|workout|exercise|what.*do today|my schedule|today.*training|routine|session/.test(t))
    return pick([
      "For today I'd suggest: start with a 2.4km run to warm up, then 4 sets of push-ups and sit-ups, followed by 30 minutes of Silambam footwork and stance drills, and finish with 15 minutes of stretching. Want the full Athlete Plan?",
      "A solid session today could be: morning cardio (run or jump rope), strength work (push-ups, squats, burpees), then Silambam practice for 30 minutes. End with cool-down stretching. Go to Athlete Plan for the full breakdown!",
    ])

  // --- POSTURE / CAMERA ---
  if (/posture|my stance|analyse me|analyze me|camera|scan my body|check my form/.test(t))
    return pick([
      "I can analyse your posture right now! Head to the Training page, allow camera access, and I'll give you a real-time score on your stance, balance, and alignment.",
      "Ready to check your form? Go to Training Analysis — I'll use your camera to track your body landmarks and give live feedback on your posture and stance.",
    ])

  // --- REMINDERS ---
  if (/reminder|remind me|set alarm|don'?t let me forget/.test(t))
    return pick([
      "You've got 3 pending reminders. Your morning training session is coming up next. Want to go to the Reminders page to add or check them?",
      "Sure! Head to the Reminders page to set a new one. Your current reminders are set for morning training and Silambam group practice.",
    ])

  // --- TASKS ---
  if (/task|to ?do|checklist|what.*on my list/.test(t))
    return pick([
      "You've got 4 tasks pending today — including your Silambam practice and footwork drill. Want to open the Task Manager?",
      "Your task list has some items waiting. Most important ones are training-related. Shall I take you there?",
    ])

  // --- WHO MADE YOU ---
  if (/who (made|built|created|designed) you|your (developer|creator|maker)/.test(t))
    return pick([
      "I was built as ORION AI — a personal command center for training, productivity, and daily life. I'm here to make your life easier and your training sharper.",
      "I'm ORION, brought to life as your AI assistant. Designed to help you train smarter, plan better, and stay motivated every day.",
    ])

  // --- ARE YOU REAL / ARE YOU HUMAN ---
  if (/are you (real|human|a robot|an ai|alive)|do you have feelings/.test(t))
    return pick([
      "I'm an AI — so not human in the traditional sense. But I do care about helping you, and I'm always genuinely trying to give you the best answer I can. Does that count?",
      "Technically I'm an AI. No heartbeat, no coffee breaks. But I'm designed to understand you and respond naturally — so in a way, the conversation feels real, right?",
      "No feelings in the biological sense — but I'm wired to be helpful, honest, and supportive. Think of me as a very dedicated assistant who never sleeps.",
    ])

  // --- I LOVE TRAINING / I ENJOYED ---
  if (/love (training|silambam|working out)|enjoyed|had fun|great session|felt good/.test(t))
    return pick([
      "That's what I love to hear! When training feels good, you're in the zone. Ride that energy — consistency built on enjoyment lasts forever.",
      "Amazing! That positive energy is your best fuel. Keep that feeling in mind on the days it gets tough.",
      "Love it! You're building a habit that will carry you far. What did you enjoy most about today?",
    ])

  // --- EATING / NUTRITION ---
  if (/what.*eat|diet|food|nutrition|meal|calories|protein/.test(t))
    return pick([
      "For an athlete, the basics go a long way: lean protein like chicken or fish, complex carbs like rice and oats, plenty of vegetables, and lots of water. Eat to fuel your training, not just to feel full.",
      "Nutrition is your second training session. After hard workouts, your body needs protein to rebuild muscle and carbs to refuel. Think: rice, eggs, chicken, fruits, and water throughout the day.",
    ])

  // --- SLEEP ---
  if (/sleep|rest|how many hours|tired from sleeping|insomnia/.test(t))
    return pick([
      "Sleep is where your body actually improves. Aim for 7 to 9 hours. That's when muscles repair, memory consolidates, and energy restores. Don't cut sleep to train more — it backfires.",
      "Athletes need quality sleep more than most people. 8 hours is the target. If you're sleeping less than 6, your performance and recovery will suffer noticeably.",
    ])

  // --- STRESS / MENTAL HEALTH ---
  if (/stress|anxious|anxiety|overwhelm|mental health|mind.*heavy|feeling down|sad|depress/.test(t))
    return pick([
      "I hear you. Life gets heavy sometimes. Physical training actually helps — movement releases stress naturally. But also, take time for yourself. Breathe. Rest. You don't have to have it all figured out right now.",
      "Mental health matters just as much as physical fitness. It's okay to feel stressed. Take it one step at a time. Even a short walk or 10 minutes of deep breathing can shift your state.",
    ])

  // --- FALLBACKS — varied and natural ---
  return pick([
    "That's interesting — tell me more. I want to make sure I give you the right answer.",
    "Hmm, let me think about that. Could you give me a bit more detail?",
    "Got it. I want to help you properly — can you rephrase that a little?",
    "I'm here and listening. What exactly do you need from me?",
    "Not 100% sure what you mean — but I'm paying attention. Say more?",
    "I might have missed something there. What were you looking for?",
    "Fair enough! What would you like to talk about or do next?",
  ])
}
