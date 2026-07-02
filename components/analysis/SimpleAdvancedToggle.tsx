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
        className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl transition-all active:scale-[0.99]"
        style={{
          background: open ? 'rgba(0,212,255,0.06)' : 'rgba(255,255,255,0.03)',
          border: open ? '1px solid rgba(0,212,255,0.25)' : '1px solid rgba(255,255,255,0.07)',
          color: open ? '#00d4ff' : '#64748b',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}>
        <span>ADVANCED DATA</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="mt-2 rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(0,212,255,0.12)', background: 'rgba(0,212,255,0.03)' }}>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <Row label="Stick Speed"  value={data.stickSpeed} />
            <Row label="Confidence"   value={`${data.confidence}%`} highlight={data.confidence >= 80} />
            <Row label="Target Zone"  value={data.targetZone} />
            <Row label="Footwork"     value={data.footworkType} />
            {data.detectedTechniques && (
              <Row label="Detected"   value={data.detectedTechniques} mono />
            )}
          </div>
          {data.technicalNote && (
            <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">Technical Note</p>
              <p className="text-slate-300 text-sm leading-relaxed">{data.technicalNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, highlight, mono }: { label: string; value: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-bold ${mono ? 'font-mono' : ''}`}
        style={{ color: highlight ? '#00d4ff' : '#e2e8f0' }}>
        {value}
      </span>
    </div>
  )
}
