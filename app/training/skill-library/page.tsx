'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/layout/AppShell'
import SkillClipCard from '@/components/skillLibrary/SkillClipCard'
import AnimationPreviewCard from '@/components/skillLibrary/AnimationPreviewCard'
import { Upload, Search, BookOpen, FolderOpen, Zap, ChevronRight, X, MessageCircle } from 'lucide-react'
import { SkillClip, VideoAnalysisSession, SKILL_FOLDERS } from '@/types/skillLibrary'
import { getAllClips, getClipsByCategory, deleteClip, searchClips, analyzeVideoMock, initializeLibrary, getSessions } from '@/lib/skillLibrary/store'

type View = 'home' | 'folder' | 'search' | 'upload' | 'sessions' | 'orion'

export default function SkillLibraryPage() {
  const [view, setView]               = useState<View>('home')
  const [clips, setClips]             = useState<SkillClip[]>([])
  const [sessions, setSessions]       = useState<VideoAnalysisSession[]>([])
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [folderClips, setFolderClips] = useState<SkillClip[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SkillClip[]>([])
  const [filterCat, setFilterCat]     = useState('all')
  const [uploading, setUploading]     = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMsg, setUploadMsg]     = useState('')
  const [lastSession, setLastSession] = useState<VideoAnalysisSession | null>(null)
  const [orionQuestion, setOrionQuestion] = useState('')
  const [orionAnswer, setOrionAnswer] = useState('')
  const [orionLoading, setOrionLoading] = useState(false)
  const [selectedClip, setSelectedClip] = useState<SkillClip | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initializeLibrary()
    setClips(getAllClips())
    setSessions(getSessions())
  }, [])

  function openFolder(folderId: string, category: string) {
    const fc = category === 'saved_animations' ? getAllClips() : getClipsByCategory(category)
    setFolderClips(fc)
    setActiveFolder(folderId)
    setView('folder')
  }

  function handleSearch(q: string) {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    setSearchResults(searchClips(q, filterCat === 'all' ? undefined : filterCat))
  }

  function handleDeleteClip(id: string) {
    deleteClip(id)
    setClips(getAllClips())
    setFolderClips(prev => prev.filter(c => c.id !== id))
    setSearchResults(prev => prev.filter(c => c.id !== id))
  }

  async function handleUpload(file: File) {
    setUploading(true)
    setUploadProgress(0)
    setView('upload')
    const session = await analyzeVideoMock(file, (pct, msg) => {
      setUploadProgress(pct)
      setUploadMsg(msg)
    })
    setLastSession(session)
    setClips(getAllClips())
    setSessions(getSessions())
    setUploading(false)
  }

  async function askOrion(clip: SkillClip | null, customQ?: string) {
    const q = customQ || orionQuestion
    if (!q.trim() && !clip) return
    setOrionLoading(true)
    setOrionAnswer('')
    setView('orion')
    const context = clip ? `
Clip: "${clip.title}"
Category: ${clip.category}
Fighter A: ${clip.fighterAAction}
Fighter B: ${clip.fighterBAction}
Attack: ${clip.attackDescription}
Defense: ${clip.defenseDescription}
Mistake: ${clip.mistakeDetected}
Correct solution: ${clip.correctSolution}
Coach note: ${clip.coachNote}
Rule: ${clip.ruleDecision}
Question: ${q || 'What is the best solution and improvement plan for this exchange?'}
    `.trim() : `Question about Silambam: ${q}`
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: context }),
      })
      const data = await res.json()
      setOrionAnswer(data.reply || 'No answer returned.')
    } catch { setOrionAnswer('Could not reach ORION. Check your API key.') }
    setOrionLoading(false)
  }

  const totalClips = clips.length

  return (
    <AppShell>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-5 pb-28 lg:pb-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-orion-blue animate-pulse" />
              <span className="text-orion-blue text-xs tracking-widest uppercase font-semibold">ORION</span>
            </div>
            <h1 className="text-white font-black text-2xl tracking-wide">Skill Library</h1>
            <p className="text-slate-500 text-xs mt-0.5">{totalClips} clips · {sessions.length} sessions · Silambam AI Coach</p>
          </div>
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orion-blue text-white text-xs font-bold hover:bg-orion-blue/80 transition-all active:scale-95"
            style={{ boxShadow: '0 0 12px rgba(0,212,255,0.4)' }}>
            <Upload size={14} /> Upload Video
          </button>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </div>

        {/* Nav pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {[
            { id: 'home', label: '🏠 Library', v: 'home' as View },
            { id: 'search', label: '🔍 Search', v: 'search' as View },
            { id: 'sessions', label: '📹 Sessions', v: 'sessions' as View },
            { id: 'orion', label: '🤖 Ask ORION', v: 'orion' as View },
          ].map(({ id, label, v }) => (
            <button key={id} onClick={() => setView(v)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all font-semibold ${view === v ? 'bg-orion-blue text-white border-orion-blue' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ─── HOME ─── */}
        {view === 'home' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              {SKILL_FOLDERS.map(folder => {
                const count = folder.category === 'combat' && folder.id === 'saved_animations'
                  ? totalClips
                  : getClipsByCategory(folder.category).length
                return (
                  <button key={folder.id} onClick={() => openFolder(folder.id, folder.category)}
                    className="rounded-2xl border p-4 text-left hover:scale-[1.02] transition-all active:scale-95 group"
                    style={{ background: `${folder.color}06`, borderColor: `${folder.color}25` }}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{folder.icon}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: `${folder.color}20`, color: folder.color }}>
                          {count}
                        </span>
                        <ChevronRight size={12} style={{ color: folder.color }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <p className="text-white text-xs font-bold leading-tight">{folder.name}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5 leading-snug line-clamp-2">{folder.description}</p>
                  </button>
                )
              })}
            </div>

            {/* Recent clips */}
            {clips.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Recent Clips</p>
                {clips.slice(0, 3).map(clip => (
                  <SkillClipCard key={clip.id} clip={clip} onDelete={handleDeleteClip} onAskOrion={c => { setSelectedClip(c); setView('orion') }} />
                ))}
                {clips.length > 3 && (
                  <button onClick={() => openFolder('saved_animations', 'combat')}
                    className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-400 text-xs hover:border-orion-blue/40 hover:text-orion-blue transition-all">
                    View all {clips.length} clips →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── FOLDER ─── */}
        {view === 'folder' && activeFolder && (
          <div className="space-y-3">
            <button onClick={() => setView('home')} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors">
              ← Back to Library
            </button>
            <div className="flex items-center gap-2">
              <FolderOpen size={16} className="text-orion-blue" />
              <p className="text-white font-bold">{SKILL_FOLDERS.find(f => f.id === activeFolder)?.name}</p>
              <span className="text-xs text-slate-500">({folderClips.length} clips)</span>
            </div>
            {folderClips.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No clips in this folder yet.<br />Upload a video to start building your library.
              </div>
            ) : (
              folderClips.map(clip => (
                <SkillClipCard key={clip.id} clip={clip} onDelete={handleDeleteClip} onAskOrion={c => { setSelectedClip(c); setView('orion') }} />
              ))
            )}
          </div>
        )}

        {/* ─── SEARCH ─── */}
        {view === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={searchQuery} onChange={e => handleSearch(e.target.value)}
                placeholder="Search clips, techniques, mistakes..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orion-blue/50" />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Category filter */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              {['all', 'attack', 'defense', 'counter_attack', 'footwork', 'ring_control', 'mistake_correction'].map(cat => (
                <button key={cat} onClick={() => { setFilterCat(cat); if (searchQuery) handleSearch(searchQuery) }}
                  className={`flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full border font-semibold transition-all capitalize ${filterCat === cat ? 'bg-orion-blue text-white border-orion-blue' : 'border-slate-700 text-slate-400'}`}>
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">{searchResults.length} results</p>
                {searchResults.map(clip => (
                  <SkillClipCard key={clip.id} clip={clip} onDelete={handleDeleteClip} onAskOrion={c => { setSelectedClip(c); setView('orion') }} />
                ))}
              </div>
            ) : searchQuery ? (
              <p className="text-center text-slate-500 text-sm py-8">No clips match "{searchQuery}"</p>
            ) : (
              <p className="text-center text-slate-500 text-sm py-8">Type to search your skill library</p>
            )}
          </div>
        )}

        {/* ─── UPLOAD / ANALYSIS PROGRESS ─── */}
        {view === 'upload' && (
          <div className="space-y-4">
            {uploading ? (
              <div className="glass rounded-2xl border border-orion-border p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orion-blue animate-pulse" />
                  <p className="text-orion-blue text-sm font-bold">ORION Analysing Video...</p>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orion-blue rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%`, boxShadow: '0 0 8px #00d4ff' }} />
                </div>
                <p className="text-xs text-slate-400">{uploadMsg}</p>
                <p className="text-xs text-slate-600">{uploadProgress}% complete</p>
              </div>
            ) : lastSession ? (
              <div className="space-y-3">
                <div className="glass rounded-2xl border border-green-400/30 p-5 space-y-3">
                  <p className="text-green-400 font-bold text-sm">✓ Analysis Complete!</p>
                  <p className="text-slate-300 text-sm">{lastSession.videoName}</p>
                  <p className="text-slate-400 text-xs">{lastSession.summary}</p>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-xl p-3 bg-slate-800/60 text-center border border-slate-700">
                      <p className="text-orion-blue font-bold text-lg">{lastSession.totalClipsDetected}</p>
                      <p className="text-slate-500 text-xs">Clips Detected</p>
                    </div>
                    <div className="flex-1 rounded-xl p-3 bg-slate-800/60 text-center border border-slate-700">
                      <p className="text-orion-blue font-bold text-lg">{lastSession.categoriesDetected.length}</p>
                      <p className="text-slate-500 text-xs">Categories</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {lastSession.categoriesDetected.map(c => (
                      <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-orion-blue/10 border border-orion-blue/20 text-orion-blue capitalize">{c.replace('_', ' ')}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Detected Clips</p>
                {lastSession.clips.map(clip => (
                  <SkillClipCard key={clip.id} clip={clip} onDelete={handleDeleteClip} defaultExpanded onAskOrion={c => { setSelectedClip(c); setView('orion') }} />
                ))}
                <button onClick={() => setView('home')}
                  className="w-full py-3 rounded-xl bg-orion-blue text-white font-bold text-sm hover:bg-orion-blue/80 transition-all">
                  Save to Library →
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* ─── SESSIONS ─── */}
        {view === 'sessions' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Upload Sessions ({sessions.length})</p>
            {sessions.map(s => (
              <div key={s.id} className="glass rounded-2xl border border-orion-border p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm">{s.videoName}</p>
                    <p className="text-slate-500 text-xs">{new Date(s.uploadedAt).toLocaleDateString()} · {s.totalClipsDetected} clips</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: s.status === 'completed' ? '#00ff8820' : '#f9741620', color: s.status === 'completed' ? '#00ff88' : '#f97416', border: `1px solid ${s.status === 'completed' ? '#00ff8840' : '#f9741640'}` }}>
                    {s.status}
                  </span>
                </div>
                <p className="text-slate-400 text-xs">{s.summary}</p>
                <div className="flex flex-wrap gap-1">
                  {s.categoriesDetected.map(c => (
                    <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 capitalize">{c.replace('_', ' ')}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── ASK ORION ─── */}
        {view === 'orion' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orion-blue/20 border border-orion-blue/40 flex items-center justify-center">
                <span className="text-orion-blue font-black text-sm">O</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm">Ask ORION for Solution</p>
                <p className="text-slate-500 text-xs">ORION searches saved clips and gives coaching advice</p>
              </div>
            </div>

            {selectedClip && (
              <div className="rounded-2xl border border-orion-blue/20 bg-orion-blue/5 p-3">
                <p className="text-xs text-slate-500 mb-1">Context clip:</p>
                <p className="text-orion-blue text-sm font-semibold">{selectedClip.title}</p>
                <button onClick={() => setSelectedClip(null)} className="text-xs text-slate-500 hover:text-white mt-1">× Remove context</button>
              </div>
            )}

            <div className="flex gap-2">
              <input value={orionQuestion} onChange={e => setOrionQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && askOrion(selectedClip)}
                placeholder="How to counter this attack? What drill helps? Why no point?..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orion-blue/50" />
              <button onClick={() => askOrion(selectedClip)} disabled={orionLoading}
                className="px-4 rounded-xl bg-orion-blue text-white text-sm font-bold disabled:opacity-50 hover:bg-orion-blue/80 transition-all">
                Ask
              </button>
            </div>

            {/* Quick questions */}
            <div className="flex flex-wrap gap-1.5">
              {['How to counter this attack?', 'What mistake happened?', 'What drill should I do?', 'Why was there no point?', 'How to improve distance?'].map(q => (
                <button key={q} onClick={() => { setOrionQuestion(q); askOrion(selectedClip, q) }}
                  className="text-[10px] px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 hover:border-orion-blue/40 hover:text-orion-blue transition-all">
                  {q}
                </button>
              ))}
            </div>

            {(orionLoading || orionAnswer) && (
              <div className="glass rounded-2xl border border-orion-blue/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orion-blue animate-pulse" />
                  <p className="text-orion-blue text-xs font-bold uppercase tracking-widest">ORION</p>
                </div>
                {orionLoading ? (
                  <div className="flex gap-1.5 py-2">
                    {[0,150,300].map(d => <span key={d} className="w-2 h-2 bg-orion-blue rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                ) : (
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">{orionAnswer}</p>
                )}
              </div>
            )}

            {/* Show related clips */}
            {orionAnswer && clips.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Related Clips in Your Library</p>
                {clips.slice(0, 2).map(clip => (
                  <SkillClipCard key={clip.id} clip={clip} onAskOrion={c => setSelectedClip(c)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
