'use client'

// PoseLandmarker utility using @mediapipe/tasks-vision
let poseLandmarker: any = null
let isLoading = false

export async function loadPoseLandmarker() {
  if (poseLandmarker) return poseLandmarker
  if (isLoading) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return poseLandmarker
  }
  isLoading = true
  try {
    const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    )
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 4, // detect up to 4 players simultaneously
    })
    isLoading = false
    return poseLandmarker
  } catch (err) {
    isLoading = false
    console.error('Failed to load PoseLandmarker:', err)
    throw err
  }
}

export function detectPose(video: HTMLVideoElement, timestamp: number) {
  if (!poseLandmarker) return null
  try {
    return poseLandmarker.detectForVideo(video, timestamp)
  } catch {
    return null
  }
}

// Colors for each detected player
export const PLAYER_COLORS = ['#00d4ff', '#00ff88', '#f97316', '#a855f7']
export const PLAYER_LABELS = ['Player 1', 'Player 2', 'Player 3', 'Player 4']

// MediaPipe Pose landmark indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
}

export const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28],
]
