'use client'
import { useState } from 'react'
import { SkillClip } from '@/types/skillLibrary'
import AnimationPreviewCard from './AnimationPreviewCard'
import { ChevronDown, ChevronUp, Trash2, MessageCircle } from 'lucide-react'

type Props = {
  clip: SkillClip
  onDelete?: (id: string) => void
  onAskOrion?: (clip: SkillClip) => void
  defaultExpanded?: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  combat: '#00d4ff', attack: '#f97316', defense: '#00ff88',
  counter_attack: '#a855f7', footwork: '#eab308', distance: '#06b6d4',
  ring_control: '#3b82f6', mistake_correction: '#ef4444',
  thanithiramai: '#f59e0b', kuthuvarisai: '#ec4899', sandai_murai: '#8b5cf6',
}

const DIFF_COLORS = { beginner: '#00ff88', intermediate: '#eab308', advanced: '#ef4444' }

export default function SkillClipCard({ clip, onDelete, onAskOrion, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const catColor = CATEGORY_COLORS[clip.category] || '#00d4ff'
  const diffColor = DIFF_COLORS[clip.difficulty] || '#00d4ff'

  const pointIsScored = clip.pointDecision.toLowerCase().includes('point to') || clip.pointDecision.toLowerCase().includes('1 point')
  const pointColor = clip.pointDecision.toLowerCase().includes('no point') ? '#ef4444' : clip.pointDecision.toLowerCase().includes('deduct') ? '#f97316' : '#00ff88'

  return (
    <div className="rounded-2xl border overflow-hidden transition-all" style={{ borderColor: expanded ? `${catColor}40` : '#1e293b', background: '#0f172a' }}>
      {/* Header */}
      <button className="w-full flex items-start gap-3 p-4 hover:bg-white/5 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}>
        {/* Category dot */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${catColor}18`, border: `1px solid ${catColor}40` }}>
          <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: catColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight">{clip.title}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize"
              style={{ background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}30` }}>
              {clip.category.replace('_', ' ')}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize"
              style={{ background: `${diffColor}18`, color: diffColor, border: `1px solid ${diffColor}30` }}>
              {clip.difficulty}
            </span>
            <span className="text-[10px] text-slate-500">⏱ {clip.timestampStart}–{clip.timestampEnd}</span>
            <span className="text-[10px]" style={{ color: pointColor }}>
              {clip.pointDecision.toLowerCase().includes('no point') ? '✗' : clip.pointDecision.toLowerCase().includes('deduct') ? '⚠' : '✓'} {clip.pointDecision}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0 mt-1" /> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: `${catColor}20` }}>
          {/* Animation */}
          <div className="pt-4">
            <AnimationPreviewCard clip={clip} width={320} height={180} autoPlay />
          </div>

          {/* Exchange breakdown */}
          <div className="grid grid-cols-1 gap-2">
            {[
              { icon: '🔴', label: 'Fighter A', text: clip.fighterAAction, color: '#f97316' },
              { icon: '🔵', label: 'Fighter B', text: clip.fighterBAction, color: '#3b82f6' },
            ].map(({ icon, label, text, color }) => (
              <div key={label} className="rounded-xl p-3 border" style={{ background: `${color}08`, borderColor: `${color}25` }}>
                <p className="text-xs font-bold mb-1" style={{ color }}>{icon} {label}</p>
                <p className="text-slate-300 text-xs">{text}</p>
              </div>
            ))}
          </div>

          {/* Full analysis */}
          <div className="space-y-2.5">
            {[
              { label: '⚔️ Attack', text: clip.attackDescription, color: '#f97316' },
              { label: '🛡️ Defense', text: clip.defenseDescription, color: '#3b82f6' },
              { label: '↩ Counter Suggestion', text: clip.counterAttackSuggestion, color: '#a855f7' },
              { label: '🦶 Footwork', text: clip.footworkExplanation, color: '#eab308' },
            ].map(({ label, text, color }) => (
              <div key={label}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
                <p className="text-slate-300 text-xs leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          {/* Mistake + solution */}
          {clip.mistakeDetected && (
            <div className="rounded-xl p-3 border border-red-400/20 bg-red-400/5 space-y-2">
              <p className="text-xs font-bold text-red-400">❌ Mistake Detected</p>
              <p className="text-slate-300 text-xs">{clip.mistakeDetected}</p>
              <p className="text-xs font-bold text-green-400 mt-2">✓ Correct Solution</p>
              <p className="text-slate-300 text-xs">{clip.correctSolution}</p>
            </div>
          )}

          {/* Coach note */}
          <div className="rounded-xl p-3 border border-orion-blue/20 bg-orion-blue/5">
            <p className="text-xs font-bold text-orion-blue mb-1">🎓 ORION Coach Note</p>
            <p className="text-slate-300 text-xs leading-relaxed">{clip.coachNote}</p>
          </div>

          {/* Rule + point */}
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl p-2.5 border border-slate-700 bg-slate-800/40">
              <p className="text-[10px] text-slate-500 mb-0.5">RULE DECISION</p>
              <p className="text-slate-300 text-xs">{clip.ruleDecision}</p>
            </div>
            <div className="rounded-xl p-2.5 border text-center min-w-[90px]"
              style={{ borderColor: `${pointColor}30`, background: `${pointColor}08` }}>
              <p className="text-[10px] text-slate-500 mb-0.5">RESULT</p>
              <p className="text-xs font-bold" style={{ color: pointColor }}>{clip.pointDecision}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {clip.tags.map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">{t}</span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={() => onAskOrion?.(clip)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-orion-blue/40 text-orion-blue text-xs font-bold hover:bg-orion-blue/10 transition-all">
              <MessageCircle size={13} /> Ask ORION for Solution
            </button>
            {onDelete && (
              <button onClick={() => onDelete(clip.id)}
                className="p-2.5 rounded-xl border border-red-400/20 text-red-400/50 hover:text-red-400 hover:border-red-400/40 transition-all">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
