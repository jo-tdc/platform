'use client'

import { useState } from 'react'
import AgentCard from '@/components/practice/AgentCard'
import AgentConfig from '@/components/practice/AgentConfig'

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
  agents: Agent[]
  projectId: string
  onAddAgent?: () => void
}

export default function AgentPanel({ agents, projectId, onAddAgent }: Props) {
  const [activeAgentId, setActiveAgentId] = useState<string | null>(
    agents[0]?.id ?? null
  )

  const activeAgent = agents.find((a) => a.id === activeAgentId) ?? null

  async function handleUpdateAgent(
    agentId: string,
    updates: { custom_name?: string; context_values?: Record<string, string> }
  ) {
    await fetch(`/api/projects/${projectId}/agents/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-gray-400 text-sm mb-4">
          Aucun agent configuré pour ce projet.
        </p>
        {onAddAgent && (
          <button
            onClick={onAddAgent}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
          >
            + Ajouter un agent
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Liste des agents */}
      <div className="w-48 flex-shrink-0 border-r border-gray-200 overflow-y-auto">
        <div className="p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
            Agents
          </p>
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isActive={agent.id === activeAgentId}
              onSelect={setActiveAgentId}
            />
          ))}
          {onAddAgent && (
            <button
              onClick={onAddAgent}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-2 border border-dashed border-gray-200 rounded-xl hover:border-gray-400 transition-colors"
            >
              + Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Config / Chat de l'agent actif */}
      <div className="flex-1 overflow-hidden">
        {activeAgent ? (
          <AgentConfig
            agent={activeAgent}
            projectId={projectId}
            onUpdate={handleUpdateAgent}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">Sélectionne un agent.</p>
          </div>
        )}
      </div>
    </div>
  )
}
