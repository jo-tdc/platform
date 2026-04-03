'use client'

import { useState } from 'react'
import PracticeChat from '@/components/practice/PracticeChat'
import AgentPanel from '@/components/practice/AgentPanel'

type Agent = {
  id: string
  custom_name: string | null
  context_values: Record<string, string> | null
  agent_templates: {
    name: string
    description: string
    icon: string | null
    context_variables: Record<string, string> | null
  }
}

type Props = {
  projectId: string
  projectName: string
  agents: Agent[]
}

export default function ProjectWorkspace({ projectId, projectName, agents }: Props) {
  const [activeTab, setActiveTab] = useState<'chat' | 'agents'>('chat')

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Onglets mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex border-t border-gray-200 bg-white z-10">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chat' ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'agents' ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          Agents ({agents.length})
        </button>
      </div>

      {/* Layout desktop */}
      {/* Chat — 55% */}
      <div
        className={`flex flex-col border-r border-gray-200 ${
          activeTab === 'chat' ? 'flex' : 'hidden md:flex'
        } md:flex`}
        style={{ width: '55%' }}
      >
        <PracticeChat projectId={projectId} projectName={projectName} />
      </div>

      {/* Agents — 45% */}
      <div
        className={`flex-1 overflow-hidden ${
          activeTab === 'agents' ? 'flex' : 'hidden md:flex'
        } md:flex flex-col`}
      >
        <AgentPanel agents={agents} projectId={projectId} />
      </div>
    </div>
  )
}
