'use client'
import AppShell from '@/components/layout/AppShell'
import ChatInterface from '@/components/jarvis/ChatInterface'
import OrionOrb from '@/components/jarvis/OrionOrb'

export default function AssistantPage() {
  return (
    <AppShell>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-orion-border glass flex-shrink-0">
          <OrionOrb size="sm" status="idle" />
          <div>
            <h1 className="text-lg font-bold text-white">ORION AI</h1>
            <p className="text-xs text-slate-400">Your Personal AI Command Center</p>
          </div>
        </div>
        {/* Chat fills remaining space */}
        <div className="flex-1 min-h-0">
          <ChatInterface />
        </div>
      </div>
    </AppShell>
  )
}
