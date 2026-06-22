'use client'
import { useRef, useEffect } from 'react'
import { POSE_CONNECTIONS } from '@/lib/pose/poseDetector'

interface Props {
  landmarks: any[]
  width: number
  height: number
}

export default function PoseCanvasOverlay({ landmarks, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    if (!landmarks || landmarks.length === 0) return

    // Draw connections
    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.8
    POSE_CONNECTIONS.forEach(([a, b]) => {
      if (landmarks[a] && landmarks[b]) {
        ctx.beginPath()
        ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height)
        ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height)
        ctx.stroke()
      }
    })

    // Draw keypoints
    landmarks.forEach((lm) => {
      if (!lm) return
      const x = lm.x * width
      const y = lm.y * height
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, 2 * Math.PI)
      ctx.fillStyle = '#00d4ff'
      ctx.globalAlpha = 0.9
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
  }, [landmarks, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  )
}
