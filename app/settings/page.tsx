'use client'
import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { Save } from 'lucide-react'

export default function SettingsPage() {
  const [voiceName, setVoiceName] = useState('ORION')
  const [theme, setTheme] = useState('dark-blue')
  const [sensitivity, setSensitivity] = useState(70)
  const [saved, setSaved] = useState(false)

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Customize your ORION experience</p>
        </div>

        <div className="space-y-4">
          {/* Voice name */}
          <div className="glass rounded-2xl border border-orion-border p-4">
            <label className="text-xs text-orion-blue uppercase tracking-widest block mb-2">Assistant Name</label>
            <input
              value={voiceName}
              onChange={e => setVoiceName(e.target.value)}
              className="w-full bg-orion-navy border border-orion-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orion-blue/50"
            />
            <p className="text-xs text-slate-500 mt-2">Name used in voice responses and UI.</p>
          </div>

          {/* Theme */}
          <div className="glass rounded-2xl border border-orion-border p-4">
            <label className="text-xs text-orion-blue uppercase tracking-widest block mb-3">Theme</label>
            <div className="flex gap-3">
              {[
                { id: 'dark-blue', label: 'Dark Blue', color: '#00d4ff' },
                { id: 'dark-green', label: 'Dark Green', color: '#00ff88' },
                { id: 'dark-purple', label: 'Dark Purple', color: '#a855f7' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                    theme === t.id ? 'bg-white/10 border-white/30' : 'border-orion-border text-slate-400'
                  }`}
                  style={{ color: t.color, borderColor: theme === t.id ? t.color : undefined }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Training sensitivity */}
          <div className="glass rounded-2xl border border-orion-border p-4">
            <label className="text-xs text-orion-blue uppercase tracking-widest block mb-2">
              Training Sensitivity: <span className="text-white">{sensitivity}%</span>
            </label>
            <input
              type="range"
              min={30}
              max={100}
              value={sensitivity}
              onChange={e => setSensitivity(Number(e.target.value))}
              className="w-full accent-orion-blue"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Lenient</span>
              <span>Strict</span>
            </div>
          </div>

          {/* Privacy note */}
          <div className="glass rounded-2xl border border-yellow-400/20 p-4">
            <p className="text-xs text-yellow-400 font-semibold mb-1">Privacy Notice</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Camera processing runs entirely in your browser for this MVP. No video data is uploaded, stored, or shared. Do not record or upload private videos unless cloud AI is added later with explicit user permission.
            </p>
          </div>

          {/* Save */}
          <button
            onClick={save}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orion-blue/20 border border-orion-blue/40 text-orion-blue font-semibold hover:bg-orion-blue/30 transition-colors"
          >
            <Save size={18} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </AppShell>
  )
}
