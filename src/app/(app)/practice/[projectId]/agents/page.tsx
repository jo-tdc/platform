'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type AgentTemplate = {
  id: string
  name: string
  description: string
  icon: string | null
}

type ProjectAgent = {
  id: string
  custom_name: string | null
  agent_templates: { name: string; description: string; icon: string | null }
}

export default function AgentsPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [agents, setAgents] = useState<ProjectAgent[]>([])
  const [adding, setAdding] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/agents`)
      .then((r) => r.json())
      .then((data: { agents?: ProjectAgent[] }) => setAgents(data.agents ?? []))
      .catch(() => setError('Erreur de chargement des agents'))
  }, [projectId])

  async function handleAdd(templateId: string) {
    setAdding(templateId)
    setError(null)

    const response = await fetch(`/api/projects/${projectId}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erreur' }))
      setError(err.error)
    } else {
      const { agent } = await response.json()
      setAgents((prev) => [...prev, agent])
    }

    setAdding(null)
  }

  async function handleRemove(agentId: string) {
    setRemoving(agentId)
    await fetch(`/api/projects/${projectId}/agents/${agentId}`, { method: 'DELETE' })
    setAgents((prev) => prev.filter((a) => a.id !== agentId))
    setRemoving(null)
  }

  void templates
  void handleAdd

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link
            href={`/practice/${projectId}`}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Workspace
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-3">Agents du projet</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ajoute des agents spécialisés pour t'aider sur différents aspects du projet.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Agents actifs */}
        {agents.length > 0 ? (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Agents actifs ({agents.length})
            </h2>
            <div className="space-y-2">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-white"
                >
                  <span className="text-xl">{agent.agent_templates.icon ?? '🤖'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {agent.custom_name ?? agent.agent_templates.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{agent.agent_templates.description}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(agent.id)}
                    disabled={removing === agent.id}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    {removing === agent.id ? '...' : 'Retirer'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm mb-4">
              Aucun agent actif. Va sur la page workspace pour en ajouter.
            </p>
            <Link
              href={`/practice/${projectId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
            >
              Retour au workspace
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
