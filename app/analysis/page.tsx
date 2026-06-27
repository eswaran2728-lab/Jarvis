'use client'
import AppShell from '@/components/layout/AppShell'
import VideoAnalyzer from '@/components/training/VideoAnalyzer'
import { ShieldAlert } from 'lucide-react'

export default function AnalysisPage() {
  return (
    <AppShell>
      <div className="p-3 md:p-5 max-w-3xl mx-auto w-full pb-24">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white tracking-tight">ORION Analysis</h1>
          <p className="text-slate-400 text-xs mt-0.5">Coach-mode combat video analysis</p>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3 mb-4">
          <ShieldAlert size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            AI analysis is for training feedback only. Always train under qualified supervision.
          </p>
        </div>

        <VideoAnalyzer />
      </div>
    </AppShell>
  )
}
