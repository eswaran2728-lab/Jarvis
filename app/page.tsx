import Link from 'next/link'
import { ArrowRight, Shield, Zap, Target } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-jarvis-dark flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center relative overflow-hidden">
        {/* Background rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[300,500,700].map(s => (
            <div key={s} className="absolute rounded-full border border-jarvis-blue/10" style={{ width: s, height: s }} />
          ))}
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="mb-2 text-jarvis-blue text-sm font-semibold tracking-[0.3em] uppercase">Introducing</div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-2">
            <span className="text-jarvis-blue glow-text">ESWA</span>
          </h1>
          <h1 className="text-5xl md:text-7xl font-black tracking-widest text-white mb-6">JARVIS</h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-lg mx-auto mb-10 leading-relaxed">
            Your AI-powered training assistant. Analyze posture, master Silambam, and achieve peak performance.
          </p>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-jarvis-blue/20 border border-jarvis-blue text-jarvis-blue font-semibold text-lg hover:bg-jarvis-blue/30 transition-all glow-blue"
          >
            Enter JARVIS <ArrowRight size={20} />
          </Link>

          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { icon: Zap, label: 'AI Powered', desc: 'Real-time analysis' },
              { icon: Target, label: 'Precision', desc: 'MediaPipe pose detection' },
              { icon: Shield, label: 'Safe', desc: 'Browser only, private' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="glass rounded-2xl p-4 border border-jarvis-border text-center">
                <Icon size={24} className="text-jarvis-blue mx-auto mb-2" />
                <div className="text-white text-sm font-semibold">{label}</div>
                <div className="text-slate-500 text-xs">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-slate-600 text-xs border-t border-jarvis-border">
        ESWA JARVIS · For fitness, Silambam training and posture coaching only · Not for harmful use
      </footer>
    </div>
  )
}
