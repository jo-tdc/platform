'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Lesson = {
  id: string
  module_id: string
  position: number
  title: string
  type: 'video' | 'figma' | 'resource' | 'ui_challenge' | 'text'
  content_url: string | null
  content_body: string | null
  estimated_minutes: number | null
  is_published: boolean
}

const TYPE_LABELS: Record<Lesson['type'], string> = {
  video: 'Vidéo',
  figma: 'Figma',
  resource: 'Ressource',
  ui_challenge: 'UI Challenge',
  text: 'Texte',
}

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900'

export default function LessonEditorPage() {
  const { lessonId } = useParams() as { lessonId: string }

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<Lesson['type']>('text')
  const [contentUrl, setContentUrl] = useState('')
  const [contentBody, setContentBody] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/lessons/${lessonId}`)
      .then((r) => r.json())
      .then(({ lesson: l }: { lesson: Lesson }) => {
        setLesson(l)
        setTitle(l.title)
        setType(l.type)
        setContentUrl(l.content_url ?? '')
        setContentBody(l.content_body ?? '')
        setEstimatedMinutes(l.estimated_minutes?.toString() ?? '')
        setIsPublished(l.is_published)
      })
      .catch(() => setError('Erreur de chargement'))
  }, [lessonId])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch(`/api/admin/lessons/${lessonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        type,
        content_url: contentUrl || null,
        content_body: contentBody || null,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        is_published: isPublished,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur' }))
      setError(typeof err.error === 'string' ? err.error : 'Erreur de sauvegarde')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }

    setSaving(false)
  }

  // Minimal markdown → HTML for preview
  function renderMarkdown(md: string) {
    return md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-900 mt-5 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-gray-900 mt-6 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono">$1</code>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-gray-700">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm text-gray-700">$2</li>')
      .replace(/\n\n/g, '</p><p class="text-sm text-gray-700 my-2">')
      .replace(/^(?!<[h|l])(.+)$/gm, (line) => line.trim() ? line : '')
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-gray-400">{error ?? 'Chargement...'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/curriculum" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Curriculum
        </Link>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-600">Sauvegardé ✓</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Titre</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as Lesson['type'])} className={inputClass}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Durée (minutes)</label>
            <input type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} min={1} className={inputClass} placeholder="15" />
          </div>
          {type !== 'text' && (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">URL du contenu</label>
              <input type="url" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} className={inputClass} placeholder="https://..." />
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="rounded" />
          Publier cette leçon
        </label>

        {/* Content editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">Contenu (Markdown)</label>
            <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setTab('edit')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${tab === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Éditer
              </button>
              <button
                type="button"
                onClick={() => setTab('preview')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${tab === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Aperçu
              </button>
            </div>
          </div>

          {tab === 'edit' ? (
            <textarea
              value={contentBody}
              onChange={(e) => setContentBody(e.target.value)}
              rows={28}
              placeholder="# Titre de la leçon&#10;&#10;Contenu en Markdown..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-y font-mono leading-relaxed"
            />
          ) : (
            <div
              className="w-full min-h-[28rem] px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: contentBody ? `<p class="text-sm text-gray-700 my-2">${renderMarkdown(contentBody)}</p>` : '<p class="text-gray-400">Aucun contenu</p>' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
