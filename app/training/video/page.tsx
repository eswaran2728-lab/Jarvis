'use client'
import AppShell from '@/components/layout/AppShell'
import VideoAnalyzer from '@/components/training/VideoAnalyzer'
import { Video } from 'lucide-react'

export default function VideoAnalysisPage() {
  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-orion-blue/20 border border-orion-blue/30">
              <Video size={22} className="text-orion-blue" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Video Analysis</h1>
              <p className="text-slate-400 text-sm">Silambam Technique Assessment</p>
            </div>
          </div>
          <div className="glass rounded-xl border border-orion-border p-4">
            <p className="text-sm text-slate-300">
              <span className="text-orion-blue font-semibold">ORION:</span> Sir, upload your training video and I will analyse your Silambam technique frame by frame. I will provide feedback on your stance, stick position, footwork, and overall form.
            </p>
          </div>
        </div>

        <VideoAnalyzer />
      </div>
    </AppShell>
  )
}
