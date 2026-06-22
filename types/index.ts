export interface Task {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: string
}

export interface Reminder {
  id: string
  title: string
  datetime: string
  status: 'pending' | 'done' | 'missed'
}

export interface TrainingSession {
  id: string
  date: string
  score: number
  duration: number
  mode: string
  feedback: string[]
}

export interface Skill {
  id: string
  name: string
  level: number
  maxLevel: number
  category: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'orion'
  content: string
  timestamp: string
}

export interface PoseMetrics {
  shoulderTilt: number
  hipTilt: number
  kneeBend: number
  stanceWidth: number
  balance: number
  handHeight: number
  overallScore: number
}
