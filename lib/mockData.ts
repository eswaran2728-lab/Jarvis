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
