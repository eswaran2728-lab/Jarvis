'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type AdvancedData = {
  stickSpeed: string
  confidence: number
  targetZone: string
  footworkType: string
  technicalNote: string
  detectedTechniques: string
}

type Props = { data: AdvancedData }

export default function SimpleAdvancedToggle({ data }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-base font-semibold active:scale-[0.99] transition-all">
        <span>Advanced</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
          <Row label="Stick Speed" value={data.stickSpeed} />
          <Row label="Confidence" value={`${data.confidence}%`} />
          <Row label="Target" value={data.targetZone} />
          <Row label="Footwork" value={data.footworkType} />
          {data.detectedTechniques && (
            <Row label="Detected" value={data.detectedTechniques} />
          )}
          {data.technicalNote && (
            <div className="pt-1 border-t border-slate-800">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Note</p>
              <p className="text-slate-300 text-sm leading-relaxed">{data.technicalNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className="text-white text-sm font-semibold">{value}</span>
    </div>
  )
}
