'use client'

import { useState, useRef, useCallback } from 'react'

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/markdown',
]
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.txt', '.md']
const MAX_FILES = 10
const MAX_FILE_SIZE = 20 * 1024 * 1024

type Props = {
  onSubmit: (name: string, files: File[]) => void
  loading?: boolean
}

function fileIcon(type: string) {
  if (type === 'application/pdf') return '📄'
  if (type.startsWith('image/')) return '🖼️'
  return '📝'
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentBriefUploader({ onSubmit, loading = false }: Props) {
  const [name, setName] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(incoming: File[]) {
    setFileError(null)
    const valid: File[] = []
    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type) && !file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
        setFileError(`Type non supporté : ${file.name}`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`Fichier trop volumineux : ${file.name} (max 20 MB)`)
        continue
      }
      valid.push(file)
    }
    setFiles((prev) => {
      const combined = [...prev, ...valid]
      if (combined.length > MAX_FILES) {
        setFileError(`Maximum ${MAX_FILES} fichiers`)
        return combined.slice(0, MAX_FILES)
      }
      return combined
    })
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || files.length === 0 || loading) return
    onSubmit(name.trim(), files)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nom du projet */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom du projet <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Ex : Redesign de l'onboarding Figma"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Zone drag & drop */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Documents <span className="text-red-500">*</span>
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-gray-900 bg-gray-50'
              : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-gray-400">
              <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 15V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-sm font-medium text-gray-700">
              {dragOver ? 'Dépose ici' : 'Glisse-dépose ou clique pour ajouter'}
            </p>
            <p className="text-xs text-gray-400">
              PDF, images (PNG, JPG, WebP), fichiers texte — max 20 MB par fichier, {MAX_FILES} fichiers max
            </p>
          </div>
        </div>

        {fileError && (
          <p className="text-xs text-red-600 mt-1">{fileError}</p>
        )}
      </div>

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span className="text-base flex-shrink-0">{fileIcon(file.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-700 transition-colors p-1"
                aria-label="Supprimer"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={!name.trim() || files.length === 0 || loading}
        className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Analyse en cours...' : `Générer le brief depuis ${files.length > 0 ? `${files.length} document${files.length > 1 ? 's' : ''}` : 'les documents'} →`}
      </button>
    </form>
  )
}
