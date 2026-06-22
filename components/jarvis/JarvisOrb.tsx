'use client'
import { useState, useEffect } from 'react'

interface JarvisOrbProps {
  size?: 'sm' | 'md' | 'lg'
  status?: 'idle' | 'listening' | 'processing' | 'speaking'
}

export default function JarvisOrb({ size = 'md', status = 'idle' }: JarvisOrbProps) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 100)
    return () => clearInterval(id)
  }, [])

  const sizes = { sm: 80, md: 140, lg: 200 }
  const s = sizes[size]

  const statusColors = {
    idle: '#00d4ff',
    listening: '#00ff88',
    processing: '#ff6b35',
    speaking: '#a855f7',
  }
  const color = statusColors[status]

  return (
    <div className="relative flex items-center justify-center" style={{ width: s, height: s }}>
      {/* Outer rotating ring */}
      <div
        className="absolute inset-0 rounded-full border-2 rotate-ring"
        style={{
          borderColor: color,
          borderTopColor: 'transparent',
          opacity: 0.6,
        }}
      />
      {/* Middle ring */}
      <div
        className="absolute rounded-full border"
        style={{
          inset: s * 0.08,
          borderColor: color,
          opacity: 0.4,
          animation: 'rotate-ring 5s linear infinite reverse',
        }}
      />
      {/* Core orb */}
      <div
        className="absolute rounded-full orb-pulse"
        style={{
          inset: s * 0.2,
          background: `radial-gradient(circle at 35% 35%, ${color}44, ${color}11, #050810)`,
          boxShadow: `0 0 ${s * 0.2}px ${color}88, inset 0 0 ${s * 0.1}px ${color}44`,
          border: `1px solid ${color}66`,
        }}
      />
      {/* Center dot */}
      <div
        className="absolute rounded-full"
        style={{
          width: s * 0.12,
          height: s * 0.12,
          background: color,
          boxShadow: `0 0 ${s * 0.08}px ${color}`,
        }}
      />
      {/* Status label */}
      <div className="absolute -bottom-6 text-xs text-center" style={{ color, width: s }}>
        {status.toUpperCase()}
      </div>
    </div>
  )
}
