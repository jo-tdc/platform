'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Project = {
  id: string
  name: string
  brief_text: string | null
  brief_summary: string | null
}

export default function BriefPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [briefSummary, setBriefSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then(({ project: p }: { project: Project }) => {
        setProject(p)
        setBriefSummary(p.brief_summary ?? '')
      })
      .catch(() => setError('Erreur de chargement'))
  }, [projectId])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief_summary: briefSummary }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erreur de sauvegarde' }))
      setError(err.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }

    setSaving(false)
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    )
  }

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
          <h1 className="text-xl font-semibold text-gray-900 mt-3">{project.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Brief du projet</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Résumé du brief
            </label>
            <textarea
              value={briefSummary}
              onChange={(e) => setBriefSummary(e.target.value)}
              rows={16}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none font-mono"
              placeholder="Le brief de ton projet apparaîtra ici..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Modifier ce brief invalidera les prompts compilés de tous les agents du projet.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="text-xs text-green-600">Sauvegardé ✓</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
