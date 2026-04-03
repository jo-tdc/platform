'use client'

import { useState } from 'react'

type ProjectFile = {
  id: string
  file_name: string
  file_type: 'pdf' | 'image' | 'link'
  storage_url: string
  uploaded_at: string
}

type Props = {
  projectId: string
  files: ProjectFile[]
  onFileAdded: (file: ProjectFile) => void
}

export default function FileUploader({ projectId, files, onFileAdded }: Props) {
  const [linkUrl, setLinkUrl] = useState('')
  const [linkName, setLinkName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault()
    if (!linkUrl || !linkName) return

    setLoading(true)
    setError(null)

    const response = await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_name: linkName, file_type: 'link', storage_url: linkUrl }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
      setError(err.error)
    } else {
      const data = await response.json()
      onFileAdded(data.file)
      setLinkUrl('')
      setLinkName('')
    }

    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span className="text-sm">
                {file.file_type === 'link' ? '🔗' : file.file_type === 'pdf' ? '📄' : '🖼️'}
              </span>
              <a
                href={file.storage_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-gray-700 hover:text-gray-900 truncate"
              >
                {file.file_name}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Ajouter un lien */}
      <form onSubmit={handleAddLink} className="space-y-2">
        <p className="text-xs font-medium text-gray-600">Ajouter un lien</p>
        <input
          type="text"
          value={linkName}
          onChange={(e) => setLinkName(e.target.value)}
          placeholder="Nom de la ressource"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !linkUrl || !linkName}
          className="w-full py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Ajout...' : 'Ajouter'}
        </button>
      </form>
    </div>
  )
}
