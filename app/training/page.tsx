'use client'
import AppShell from '@/components/layout/AppShell'
import CameraPoseAnalyzer from '@/components/training/CameraPoseAnalyzer'
import Link from 'next/link'
import { Swords } from 'lucide-react'

export default function TrainingPage() {
  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Training Analysis</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time pose detection with AI feedback</p>
        </div>

        <div className="mb-4 glass rounded-2xl border border-jarvis-border p-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            <span className="text-jarvis-blue font-semibold">Sir, training mode is ready.</span> Stand in front of your camera. I will analyze your stance, balance, and posture in real time.
          </p>
        </div>

        <CameraPoseAnalyzer />

        <div className="mt-6 glass rounded-2xl border border-orange-400/30 p-4 flex items-center gap-3">
          <Swords size={20} className="text-orange-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">Try Silambam Coach Mode</p>
            <p className="text-xs text-slate-400 mt-0.5">Guided training for traditional Silambam martial art.</p>
          </div>
          <Link href="/training/silambam" className="ml-auto text-xs text-orange-400 border border-orange-400/40 px-3 py-1.5 rounded-lg hover:bg-orange-400/10 transition-colors flex-shrink-0">
            Open
          </Link>
        </div>

        <p className="text-xs text-slate-500 text-center mt-6">
          AI feedback is for training support only. Always train under a qualified instructor. Do not use this app for harmful actions.
        </p>
      </div>
    </AppShell>
  )
}
