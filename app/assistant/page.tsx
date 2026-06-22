import AppShell from '@/components/layout/AppShell'
import ChatInterface from '@/components/jarvis/ChatInterface'
import JarvisOrb from '@/components/jarvis/JarvisOrb'

export default function AssistantPage() {
  return (
    <AppShell>
      <div className="flex flex-col h-screen lg:h-auto lg:min-h-screen">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-jarvis-border glass sticky top-0 z-10">
          <JarvisOrb size="sm" status="idle" />
          <div>
            <h1 className="text-lg font-bold text-white">JARVIS Assistant</h1>
            <p className="text-xs text-slate-400">Ask me anything about your training</p>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </AppShell>
  )
}
