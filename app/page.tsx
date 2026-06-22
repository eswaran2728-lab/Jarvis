import Link from 'next/link'
import { ArrowRight, Shield, Zap, Target, Brain, Mic, Activity } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-orion-dark flex flex-col">
      {/* Background rings */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {[400, 650, 900].map(s => (
          <div
            key={s}
            className="absolute rounded-full border border-orion-blue/8"
            style={{ width: s, height: s }}
          />
        ))}
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center relative z-10">
        <div className="max-w-3xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orion-blue/10 border border-orion-blue/30 text-orion-blue text-xs font-semibold tracking-widest uppercase mb-8">
            <span className="w-2 h-2 rounded-full bg-orion-blue animate-pulse" />
            System Online
          </div>

          {/* Main title */}
          <h1 className="text-7xl md:text-9xl font-black tracking-tight mb-2 leading-none">
            <span className="text-orion-blue glow-text">ORION</span>
            <span className="text-white"> AI</span>
          </h1>

          {/* Full form */}
          <p className="text-slate-400 text-sm md:text-base tracking-[0.15em] uppercase mb-3 font-medium">
            Optimized Real-time Intelligent Operations Network
          </p>

          {/* Tagline */}
          <p className="text-white/70 text-xl md:text-2xl font-light mb-10">
            Your Personal AI Command Center
          </p>

          <p className="text-slate-400 text-base max-w-xl mx-auto mb-12 leading-relaxed">
            ORION AI is your personal AI assistant for daily tasks, voice commands,
            Silambam training analysis, posture coaching, and personal productivity.
          </p>

          {/* CTA */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-orion-blue/20 border border-orion-blue text-orion-blue font-semibold text-lg hover:bg-orion-blue/30 transition-all glow-blue"
          >
            Enter ORION AI <ArrowRight size={20} />
          </Link>

          {/* Feature grid */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: Brain, label: 'AI Powered', desc: 'Smart assistant responses' },
              { icon: Activity, label: 'Pose Analysis', desc: 'MediaPipe real-time detection' },
              { icon: Mic, label: 'Voice Commands', desc: 'Hands-free control' },
              { icon: Zap, label: 'Live Feedback', desc: 'Instant training scores' },
              { icon: Target, label: 'Silambam Coach', desc: 'Traditional martial art guide' },
              { icon: Shield, label: 'Private & Safe', desc: 'Browser-only processing' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="glass rounded-2xl p-4 border border-orion-border text-center hover:border-orion-blue/30 transition-colors">
                <Icon size={22} className="text-orion-blue mx-auto mb-2" />
                <div className="text-white text-sm font-semibold">{label}</div>
                <div className="text-slate-500 text-xs mt-0.5">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-600 text-xs border-t border-orion-border relative z-10">
        Powered by ORION AI — Optimized Real-time Intelligent Operations Network
        <span className="mx-2">·</span>
        For fitness, Silambam training and posture coaching only
        <span className="mx-2">·</span>
        Not for harmful use
      </footer>
    </div>
  )
}
