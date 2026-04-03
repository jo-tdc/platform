'use client'

import { useState } from 'react'
import ChatWindow from '@/components/chat/ChatWindow'

type ContextVariable = {
  key: string
  label: string
  placeholder?: string
}

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
  agent: Agent
  projectId: string
  onUpdate: (agentId: string, updates: { custom_name?: string; context_values?: Record<string, string> }) => Promise<void>
}

export default function AgentConfig({ agent, onUpdate }: Props) {
  const [contextValues, setContextValues] = useState<Record<string, string>>(
    agent.context_values ?? {}
  )
  const [saving, setSaving] = useState(false)
  const [showChat, setShowChat] = useState(true)

  const name = agent.custom_name ?? agent.agent_templates.name
  const icon = agent.agent_templates.icon ?? '🤖'

  // Récupérer les variables de contexte définies dans le template
  const contextVariables = agent.agent_templates.context_variables
    ? Object.entries(agent.agent_templates.context_variables).map(([key, label]) => ({
        key,
        label: String(label),
      })) as ContextVariable[]
    : []

  async function handleSaveContext() {
    setSaving(true)
    await onUpdate(agent.id, { context_values: contextValues })
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header agent */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-medium text-gray-900">{name}</p>
          <p className="text-xs text-gray-400">{agent.agent_templates.description}</p>
        </div>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setShowChat(true)}
            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
              showChat ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setShowChat(false)}
            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
              !showChat ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Config
          </button>
        </div>
      </div>

      {showChat ? (
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            apiRoute={`/api/practice/agent/${agent.id}`}
            placeholder={`Parle avec ${name}...`}
            welcomeMessage={`Je suis ${name}. Comment puis-je t'aider sur ce projet ?`}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {contextVariables.length > 0 ? (
            <>
              <p className="text-xs text-gray-500">
                Configure les paramètres spécifiques de cet agent pour ton projet.
              </p>
              {contextVariables.map((variable) => (
                <div key={variable.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {variable.label}
                  </label>
                  <input
                    type="text"
                    value={contextValues[variable.key] ?? ''}
                    onChange={(e) =>
                      setContextValues((prev) => ({ ...prev, [variable.key]: e.target.value }))
                    }
                    placeholder={variable.placeholder}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              ))}
              <button
                onClick={handleSaveContext}
                disabled={saving}
                className="w-full py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
              </button>
            </>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">
              Cet agent n'a pas de paramètres configurables.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
