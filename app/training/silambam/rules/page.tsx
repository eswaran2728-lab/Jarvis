'use client'
import { useState } from 'react'
import {
  VALID_TARGETS, INVALID_TARGETS, COMBAT_RULES, COURT_RULES,
  THANITHIRAMAI_RULES, KUTHUVARISAI_RULES, ORION_DISCLAIMER, checkTargetArea
} from '@/lib/silambam/ruleEngine'
import { Shield, Target, Clock, Users, Star, Hand, AlertTriangle, CheckCircle, XCircle, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'

type Tab = 'combat' | 'targets' | 'thanithiramai' | 'kuthuvarisai' | 'court' | 'ask'

export default function SilambamRulesPage() {
  const [tab, setTab] = useState<Tab>('combat')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkInput, setCheckInput] = useState('')
  const [checkResult, setCheckResult] = useState<ReturnType<typeof checkTargetArea> | null>(null)
  const [expandedOfficial, setExpandedOfficial] = useState<string | null>(null)

  async function askRule() {
    if (!question.trim()) return
    setLoading(true)
    setAnswer('')
    try {
      const res = await fetch('/api/silambam-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      setAnswer(data.reply || 'No answer found.')
    } catch {
      setAnswer('Could not reach ORION rule engine. Try again.')
    }
    setLoading(false)
  }

  function checkTarget() {
    if (!checkInput.trim()) return
    setCheckResult(checkTargetArea(checkInput.trim()))
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'combat', label: 'Combat Rules', icon: <Shield size={14} /> },
    { id: 'targets', label: 'Target Areas', icon: <Target size={14} /> },
    { id: 'thanithiramai', label: 'Thanithiramai', icon: <Star size={14} /> },
    { id: 'kuthuvarisai', label: 'Kuthuvarisai', icon: <Hand size={14} /> },
    { id: 'court', label: 'Court & Officials', icon: <Users size={14} /> },
    { id: 'ask', label: 'Ask ORION', icon: <MessageCircle size={14} /> },
  ]

  return (
    <div className="min-h-screen bg-orion-dark p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orion-blue/10 border border-orion-blue/30 text-orion-blue text-xs font-semibold tracking-widest uppercase">
            <Shield size={12} /> Silambam Rule Engine
          </div>
          <h1 className="text-3xl font-black text-white">Silambam <span className="text-orion-blue glow-text">Combat Rules</span></h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            ORION explains rules, checks target validity, and guides coaches and students — for learning only.
          </p>
        </div>

        {/* Disclaimer banner */}
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 flex gap-3 items-start">
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-300 text-xs leading-relaxed">{ORION_DISCLAIMER}</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === t.id
                  ? 'bg-orion-blue/20 text-orion-blue border border-orion-blue/40'
                  : 'text-slate-400 border border-slate-700 hover:border-orion-blue/30 hover:text-orion-blue'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Combat Rules ── */}
        {tab === 'combat' && (
          <div className="space-y-4">
            {/* Format */}
            <div className="glass rounded-2xl border border-orion-border p-5 space-y-3">
              <div className="flex items-center gap-2 text-orion-blue font-bold">
                <Clock size={16} /> Match Format
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Round 1', value: COMBAT_RULES.format.round1Duration, color: '#00d4ff' },
                  { label: 'Break', value: COMBAT_RULES.format.breakDuration, color: '#eab308' },
                  { label: 'Round 2', value: COMBAT_RULES.format.round2Duration, color: '#00d4ff' },
                ].map(item => (
                  <div key={item.label} className="rounded-xl p-3 border text-center" style={{ borderColor: `${item.color}30`, background: `${item.color}08` }}>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Scoring */}
            <div className="glass rounded-2xl border border-orion-border p-5 space-y-3">
              <div className="flex items-center gap-2 text-green-400 font-bold">
                <CheckCircle size={16} /> Scoring Rules
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Method', value: COMBAT_RULES.scoring.method },
                  { label: 'Winner', value: COMBAT_RULES.scoring.winner },
                  { label: 'Stick Type', value: COMBAT_RULES.scoring.stickType },
                ].map(s => (
                  <div key={s.label} className="flex gap-3 rounded-xl bg-white/3 p-3 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest min-w-[70px] pt-0.5">{s.label}</span>
                    <span className="text-slate-300 text-xs">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* General rules */}
            <div className="glass rounded-2xl border border-orion-border p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Shield size={16} /> General Rules
              </div>
              <ul className="space-y-2">
                {COMBAT_RULES.generalRules.map((rule, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-300">
                    <span className="text-orion-blue flex-shrink-0">•</span> {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Target Areas ── */}
        {tab === 'targets' && (
          <div className="space-y-4">
            {/* Quick checker */}
            <div className="glass rounded-2xl border border-orion-blue/30 p-5 space-y-3">
              <p className="text-orion-blue font-bold text-sm">🎯 Quick Target Checker</p>
              <div className="flex gap-2">
                <input
                  value={checkInput}
                  onChange={e => setCheckInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && checkTarget()}
                  placeholder="Type a body area (e.g. neck, chest, knee...)"
                  className="flex-1 bg-white/5 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orion-blue/60"
                />
                <button onClick={checkTarget}
                  className="px-4 py-2.5 rounded-xl bg-orion-blue/20 border border-orion-blue/40 text-orion-blue text-sm font-bold hover:bg-orion-blue/30 transition-all">
                  Check
                </button>
              </div>
              {checkResult && (
                <div className={`rounded-xl p-4 border space-y-1.5 ${checkResult.valid ? 'border-green-400/30 bg-green-400/5' : 'border-red-400/30 bg-red-400/5'}`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {checkResult.valid
                      ? <><CheckCircle size={15} className="text-green-400" /><span className="text-green-400">VALID — {checkResult.area}</span></>
                      : <><XCircle size={15} className="text-red-400" /><span className="text-red-400">INVALID — {checkResult.area}</span></>
                    }
                  </div>
                  <p className="text-slate-300 text-xs">{checkResult.reason}</p>
                  {checkResult.penalty && <p className="text-amber-400 text-xs">⚠️ {checkResult.penalty}</p>}
                  <p className="text-slate-500 text-[10px] pt-1">{checkResult.disclaimer}</p>
                </div>
              )}
            </div>

            {/* Valid targets */}
            <div className="glass rounded-2xl border border-green-400/20 p-5 space-y-3">
              <div className="flex items-center gap-2 text-green-400 font-bold">
                <CheckCircle size={16} /> Valid Target Areas ({VALID_TARGETS.length})
              </div>
              <div className="grid grid-cols-1 gap-2">
                {VALID_TARGETS.map(t => (
                  <div key={t.area} className="flex items-center gap-3 rounded-xl bg-green-400/5 border border-green-400/15 px-3 py-2.5">
                    <CheckCircle size={13} className="text-green-400 flex-shrink-0" />
                    <div>
                      <span className="text-white text-xs font-semibold">{t.area}</span>
                      <span className="text-slate-400 text-xs ml-2">— {t.note}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invalid targets */}
            <div className="glass rounded-2xl border border-red-400/20 p-5 space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <XCircle size={16} /> Invalid Target Areas — Prohibited ({INVALID_TARGETS.length})
              </div>
              <div className="grid grid-cols-1 gap-2">
                {INVALID_TARGETS.map(t => (
                  <div key={t.area} className="flex items-center gap-3 rounded-xl bg-red-400/5 border border-red-400/15 px-3 py-2.5">
                    <XCircle size={13} className="text-red-400 flex-shrink-0" />
                    <div>
                      <span className="text-white text-xs font-semibold">{t.area}</span>
                      <span className="text-red-300 text-xs ml-2">— {t.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Thanithiramai ── */}
        {tab === 'thanithiramai' && (
          <div className="space-y-4">
            <div className="glass rounded-2xl border border-amber-400/30 p-5 space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Star size={16} /> Thanithiramai — Individual Performance
              </div>
              <p className="text-slate-300 text-xs">{THANITHIRAMAI_RULES.description}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-amber-400/8 border border-amber-400/20 p-3 text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Duration</p>
                  <p className="text-amber-400 font-bold text-lg">{THANITHIRAMAI_RULES.duration}</p>
                </div>
                <div className="rounded-xl bg-amber-400/8 border border-amber-400/20 p-3 text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Total Score</p>
                  <p className="text-amber-400 font-bold text-lg">{THANITHIRAMAI_RULES.totalScore} marks</p>
                </div>
              </div>
            </div>

            {/* Scoring criteria */}
            <div className="glass rounded-2xl border border-orion-border p-5 space-y-3">
              <p className="text-white font-bold text-sm">Scoring Criteria</p>
              <div className="space-y-2">
                {THANITHIRAMAI_RULES.scoringCriteria.map(c => (
                  <div key={c.criterion} className="flex items-center gap-3 rounded-xl bg-white/3 border border-slate-800 p-3">
                    <div className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-amber-400 font-black text-sm">{c.marks}</span>
                    </div>
                    <div>
                      <p className="text-white text-xs font-semibold">{c.criterion}</p>
                      <p className="text-slate-400 text-xs">{c.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Techniques */}
            <div className="glass rounded-2xl border border-orion-border p-5 space-y-3">
              <p className="text-white font-bold text-sm">Required Techniques</p>
              <div className="grid grid-cols-1 gap-2">
                {THANITHIRAMAI_RULES.techniques.map(t => (
                  <div key={t.name} className="rounded-xl bg-white/3 border border-slate-800 px-3 py-2.5">
                    <span className="text-amber-400 text-xs font-bold">{t.name}</span>
                    <span className="text-slate-400 text-xs ml-2">— {t.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="glass rounded-2xl border border-orion-border p-5 space-y-2">
              <p className="text-white font-bold text-sm">Rules &amp; Notes</p>
              {THANITHIRAMAI_RULES.notes.map((n, i) => (
                <div key={i} className="flex gap-2 text-xs text-slate-300">
                  <span className="text-amber-400">•</span> {n}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Kuthuvarisai ── */}
        {tab === 'kuthuvarisai' && (
          <div className="space-y-4">
            <div className="glass rounded-2xl border border-pink-400/30 p-5 space-y-3">
              <div className="flex items-center gap-2 text-pink-400 font-bold">
                <Hand size={16} /> Kuthuvarisai — Empty-Hand Combat
              </div>
              <p className="text-slate-300 text-xs">{KUTHUVARISAI_RULES.description}</p>
            </div>

            {/* Techniques */}
            <div className="glass rounded-2xl border border-orion-border p-5 space-y-3">
              <p className="text-white font-bold text-sm">Techniques</p>
              <div className="grid grid-cols-1 gap-2">
                {KUTHUVARISAI_RULES.techniques.map(t => (
                  <div key={t.name} className="rounded-xl bg-white/3 border border-slate-800 px-3 py-2.5">
                    <span className="text-pink-400 text-xs font-bold">{t.name}</span>
                    <span className="text-slate-400 text-xs ml-2">— {t.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scoring */}
            <div className="glass rounded-2xl border border-orion-border p-5 space-y-3">
              <p className="text-white font-bold text-sm">Scoring Criteria</p>
              <div className="grid grid-cols-1 gap-2">
                {KUTHUVARISAI_RULES.scoringCriteria.map(c => (
                  <div key={c.criterion} className="rounded-xl bg-pink-400/5 border border-pink-400/15 px-3 py-2.5">
                    <span className="text-pink-400 text-xs font-bold">{c.criterion}</span>
                    <span className="text-slate-400 text-xs ml-2">— {c.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="glass rounded-2xl border border-orion-border p-5 space-y-2">
              <p className="text-white font-bold text-sm">Notes</p>
              {KUTHUVARISAI_RULES.notes.map((n, i) => (
                <div key={i} className="flex gap-2 text-xs text-slate-300">
                  <span className="text-pink-400">•</span> {n}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Court & Officials ── */}
        {tab === 'court' && (
          <div className="space-y-4">
            {/* Dimensions */}
            <div className="glass rounded-2xl border border-blue-400/30 p-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <Target size={16} /> Court Dimensions
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total Size', value: COURT_RULES.totalSize },
                  { label: 'Safety Area', value: COURT_RULES.safetyArea },
                  { label: 'Inner Circle', value: COURT_RULES.innerCircle },
                  { label: 'Boundary Width', value: COURT_RULES.boundaryWidth },
                ].map(d => (
                  <div key={d.label} className="rounded-xl bg-blue-400/5 border border-blue-400/20 p-3 text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{d.label}</p>
                    <p className="text-blue-400 font-bold text-sm">{d.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Officials */}
            <div className="glass rounded-2xl border border-orion-border p-5 space-y-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <Users size={16} /> Court Officials
              </div>
              <div className="space-y-2">
                {COURT_RULES.officials.map(o => (
                  <button key={o.role} onClick={() => setExpandedOfficial(expandedOfficial === o.role ? null : o.role)}
                    className="w-full rounded-xl bg-white/3 border border-slate-800 px-3 py-3 text-left hover:border-orion-blue/30 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs font-bold">{o.role}</span>
                      {expandedOfficial === o.role ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
                    </div>
                    {expandedOfficial === o.role && (
                      <p className="text-slate-400 text-xs mt-2">{o.duty}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Ask ORION ── */}
        {tab === 'ask' && (
          <div className="space-y-4">
            <div className="glass rounded-2xl border border-orion-blue/30 p-5 space-y-4">
              <div className="flex items-center gap-2 text-orion-blue font-bold">
                <MessageCircle size={16} /> Ask ORION About Silambam Rules
              </div>
              <p className="text-slate-400 text-xs">Ask any rule question — ORION explains it clearly based on the official Silambam rulebook.</p>

              {/* Quick question chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  'Is neck strike allowed?',
                  'How long is round 1?',
                  'What are valid target areas?',
                  'How is Thanithiramai scored?',
                  'What is Kuthuvarisai?',
                  'What happens if fighter leaves the ring?',
                ].map(q => (
                  <button key={q} onClick={() => setQuestion(q)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-orion-blue/25 text-orion-blue/70 hover:border-orion-blue/60 hover:text-orion-blue transition-all">
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && askRule()}
                  placeholder="Ask a rule question..."
                  className="flex-1 bg-white/5 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orion-blue/60"
                />
                <button onClick={askRule} disabled={loading}
                  className="px-5 py-3 rounded-xl bg-orion-blue/20 border border-orion-blue/40 text-orion-blue font-bold text-sm hover:bg-orion-blue/30 transition-all disabled:opacity-50">
                  {loading ? '...' : 'Ask'}
                </button>
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-orion-blue text-xs">
                  <div className="w-2 h-2 rounded-full bg-orion-blue animate-pulse" />
                  ORION is checking the rulebook...
                </div>
              )}

              {answer && (
                <div className="rounded-2xl border border-orion-blue/20 bg-orion-blue/5 p-4 space-y-2">
                  <p className="text-orion-blue text-xs font-bold">🎓 ORION Rule Answer</p>
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
                </div>
              )}
            </div>

            {/* Disclaimer repeat */}
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 flex gap-3 items-start">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-300/80 text-xs">{ORION_DISCLAIMER}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
