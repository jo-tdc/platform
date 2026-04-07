'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type Content = {
  id: string
  position: number
  title: string
  description: string | null
  is_published: boolean
  starter_pack_accessible: boolean
}

type Week = {
  id: string
  content_id: string | null
  position: number
  title: string
  description: string | null
  is_published: boolean
}

type Module = {
  id: string
  week_id: string
  position: number
  title: string
  slug: string
  description: string | null
  ai_context: string | null
  required_plan: 'free' | 'pro'
  is_published: boolean
  figma_url: string | null
  preview_url: string | null
  asset_url: string | null
  asset_type: 'video' | 'pdf' | 'image' | null
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const LESSON_TYPE_LABELS: Record<Lesson['type'], string> = {
  video: 'Vidéo',
  figma: 'Figma',
  resource: 'Ressource',
  ui_challenge: 'UI Challenge',
  text: 'Texte',
}

// ─── Inline editable field ────────────────────────────────────────────────────

function PublishedBadge({ value }: { value: boolean }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {value ? 'Publié' : 'Brouillon'}
    </span>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900'
const textareaClass = `${inputClass} resize-none`

// ─── Content Form ─────────────────────────────────────────────────────────────

function ContentForm({ initial, onSave, onCancel, loading }: {
  initial?: Partial<Content>
  onSave: (data: Omit<Content, 'id'>) => void
  onCancel: () => void
  loading: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [position, setPosition] = useState(initial?.position ?? 1)
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false)
  const [starterPackAccessible, setStarterPackAccessible] = useState(initial?.starter_pack_accessible ?? false)

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ title, description: description || null, position, is_published: isPublished, starter_pack_accessible: starterPackAccessible }) }} className="space-y-4">
      <Field label="Titre" required>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} placeholder="Programme principal" />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={textareaClass} placeholder="Description du contenu..." />
      </Field>
      <Field label="Position">
        <input type="number" value={position} onChange={(e) => setPosition(Number(e.target.value))} min={1} required className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="rounded" />
        Publier
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={starterPackAccessible} onChange={(e) => setStarterPackAccessible(e.target.checked)} className="rounded" />
        <span>Accessible Starter Pack <span className="text-xs text-gray-400">(HubSpot)</span></span>
      </label>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading || !title} className="flex-1 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {loading ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg transition-colors">
          Annuler
        </button>
      </div>
    </form>
  )
}

// ─── Week Form ────────────────────────────────────────────────────────────────

function WeekForm({ initial, contentId, onSave, onCancel, loading }: {
  initial?: Partial<Week>
  contentId: string
  onSave: (data: Omit<Week, 'id'>) => void
  onCancel: () => void
  loading: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [position, setPosition] = useState(initial?.position ?? 1)
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false)

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ title, description: description || null, position, is_published: isPublished, content_id: contentId }) }} className="space-y-4">
      <Field label="Titre" required>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} placeholder="Semaine 1 — Découvrir le product design" />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={textareaClass} placeholder="Ce que l'apprenant va découvrir cette semaine..." />
      </Field>
      <Field label="Position">
        <input type="number" value={position} onChange={(e) => setPosition(Number(e.target.value))} min={1} required className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="rounded" />
        Publier
      </label>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading || !title} className="flex-1 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {loading ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg transition-colors">
          Annuler
        </button>
      </div>
    </form>
  )
}

// ─── Module Form ──────────────────────────────────────────────────────────────

function ModuleForm({ weekId, initial, position, onSave, onCancel, loading }: {
  weekId: string
  initial?: Partial<Module>
  position: number
  onSave: (data: Omit<Module, 'id'>) => void
  onCancel: () => void
  loading: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [aiContext, setAiContext] = useState(initial?.ai_context ?? '')
  const [requiredPlan, setRequiredPlan] = useState<'free' | 'pro'>(initial?.required_plan ?? 'free')
  const [pos, setPos] = useState(initial?.position ?? position)
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false)
  const [figmaUrl, setFigmaUrl] = useState(initial?.figma_url ?? '')
  const [previewUrl, setPreviewUrl] = useState(initial?.preview_url ?? '')
  const [fetchingPreview, setFetchingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [assetUrl, setAssetUrl] = useState(initial?.asset_url ?? '')
  const [assetType, setAssetType] = useState<'video' | 'pdf' | 'image' | null>(initial?.asset_type ?? null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  function handleTitleChange(v: string) {
    setTitle(v)
    if (!initial?.slug) setSlug(slugify(v))
  }

  async function handleFetchPreview() {
    if (!figmaUrl) return
    setFetchingPreview(true)
    setPreviewError(null)
    const res = await fetch('/api/admin/figma-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: figmaUrl }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPreviewError(data.error ?? 'Erreur')
    } else {
      setPreviewUrl(data.preview_url)
    }
    setFetchingPreview(false)
  }

  async function uploadFileToStorage(file: File): Promise<string | null> {
    const presignRes = await fetch('/api/admin/modules/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    })
    const presignData = await presignRes.json()
    if (!presignRes.ok) return null

    const supabase = createClient()
    const { error } = await supabase.storage
      .from('module-assets')
      .uploadToSignedUrl(presignData.path, presignData.token, file, { contentType: file.type })

    if (error) return null
    return presignData.publicUrl
  }

  async function extractVideoThumbnail(file: File): Promise<File | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      const objectUrl = URL.createObjectURL(file)
      video.preload = 'metadata'
      video.muted = true
      video.src = objectUrl

      video.addEventListener('loadedmetadata', () => {
        video.currentTime = Math.min(1, video.duration * 0.1)
      })

      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(objectUrl)
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' }))
          else resolve(null)
        }, 'image/jpeg', 0.85)
      })

      video.addEventListener('error', () => { URL.revokeObjectURL(objectUrl); resolve(null) })
    })
  }

  async function handleFileUpload(file: File) {
    setUploading(true)
    setUploadError(null)

    // 1. Uploader le fichier principal
    const presignRes = await fetch('/api/admin/modules/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    })
    const presignData = await presignRes.json()
    if (!presignRes.ok) {
      setUploadError(presignData.error ?? 'Erreur lors de la création de l\'URL')
      setUploading(false)
      return
    }

    const supabase = createClient()
    const { error: uploadError } = await supabase.storage
      .from('module-assets')
      .uploadToSignedUrl(presignData.path, presignData.token, file, { contentType: file.type })

    if (uploadError) {
      console.error('[upload] Supabase Storage error:', uploadError)
      setUploadError(`Erreur upload : ${uploadError.message}`)
      setUploading(false)
      return
    }

    setAssetUrl(presignData.publicUrl)
    setAssetType(presignData.asset_type)

    // 2. Si c'est une vidéo, générer et uploader une preview automatiquement
    if (presignData.asset_type === 'video') {
      const thumbFile = await extractVideoThumbnail(file)
      if (thumbFile) {
        const thumbUrl = await uploadFileToStorage(thumbFile)
        if (thumbUrl) setPreviewUrl(thumbUrl)
      }
    }

    setUploading(false)
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ week_id: weekId, title, slug, description: description || null, ai_context: aiContext || null, required_plan: requiredPlan, position: pos, is_published: isPublished, figma_url: figmaUrl || null, preview_url: previewUrl || null, asset_url: assetUrl || null, asset_type: assetType }) }} className="space-y-4">
      <Field label="Titre" required>
        <input type="text" value={title} onChange={(e) => handleTitleChange(e.target.value)} required className={inputClass} placeholder="Introduction au product design" />
      </Field>
      <Field label="Slug" required>
        <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required pattern="[a-z0-9-]+" className={inputClass} placeholder="introduction-product-design" />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={textareaClass} placeholder="Ce que couvre ce module..." />
      </Field>
      <Field label="Contexte IA (ai_context)">
        <textarea value={aiContext} onChange={(e) => setAiContext(e.target.value)} rows={3} className={textareaClass} placeholder="Contexte fourni à l'IA pour les échanges de ce module..." />
      </Field>

      {/* Figma Slides */}
      <Field label="Lien Figma Slides">
        <div className="flex gap-2">
          <input
            type="url"
            value={figmaUrl}
            onChange={(e) => { setFigmaUrl(e.target.value); setPreviewUrl(''); setPreviewError(null) }}
            className={inputClass}
            placeholder="https://www.figma.com/slides/..."
          />
          <button
            type="button"
            onClick={handleFetchPreview}
            disabled={!figmaUrl || fetchingPreview}
            className="flex-shrink-0 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {fetchingPreview ? '...' : '↓ Preview'}
          </button>
        </div>
        {previewError && <p className="text-xs text-red-600 mt-1">{previewError}</p>}
      </Field>

      {previewUrl && (
        <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Preview Figma" className="w-full h-32 object-cover" />
          <p className="text-xs text-gray-400 px-3 py-1.5 truncate">{previewUrl}</p>
        </div>
      )}

      {/* File upload */}
      <Field label="Fichier (vidéo, PDF, image)">
        <div
          className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}
          onClick={() => document.getElementById('module-file-input')?.click()}
        >
          <input
            id="module-file-input"
            type="file"
            className="hidden"
            accept="video/mp4,video/webm,video/quicktime,application/pdf,image/png,image/jpeg,image/gif,image/webp"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
          />
          {uploading ? (
            <p className="text-sm text-gray-500">Upload en cours...</p>
          ) : assetUrl ? (
            <div className="space-y-1">
              <p className="text-xs text-green-600 font-medium">Fichier uploadé ({assetType})</p>
              <p className="text-xs text-gray-400 truncate">{assetUrl}</p>
              <button type="button" onClick={(e) => { e.stopPropagation(); setAssetUrl(''); setAssetType(null) }} className="text-xs text-red-500 hover:text-red-700">Supprimer</button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Glisser un fichier ou cliquer pour choisir<br/><span className="text-xs">MP4, WebM, MOV, PDF, PNG, JPEG, GIF, WebP — max 500 Mo</span></p>
          )}
        </div>
        {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Plan requis">
          <select value={requiredPlan} onChange={(e) => setRequiredPlan(e.target.value as 'free' | 'pro')} className={inputClass}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </Field>
        <Field label="Position">
          <input type="number" value={pos} onChange={(e) => setPos(Number(e.target.value))} min={1} required className={inputClass} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="rounded" />
        Publier
      </label>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading || !title || !slug} className="flex-1 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {loading ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg transition-colors">
          Annuler
        </button>
      </div>
    </form>
  )
}

// ─── Lesson Form ──────────────────────────────────────────────────────────────

function LessonForm({ moduleId, initial, position, onSave, onCancel, loading }: {
  moduleId: string
  initial?: Partial<Lesson>
  position: number
  onSave: (data: Omit<Lesson, 'id'>) => void
  onCancel: () => void
  loading: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [type, setType] = useState<Lesson['type']>(initial?.type ?? 'text')
  const [contentUrl, setContentUrl] = useState(initial?.content_url ?? '')
  const [estimatedMinutes, setEstimatedMinutes] = useState(initial?.estimated_minutes ?? '')
  const [pos, setPos] = useState(initial?.position ?? position)
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false)

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ module_id: moduleId, title, type, content_url: contentUrl || null, estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null, position: pos, is_published: isPublished, content_body: null }) }} className="space-y-4">
      <Field label="Titre" required>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} placeholder="Introduction au design thinking" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as Lesson['type'])} className={inputClass}>
            {Object.entries(LESSON_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Durée (minutes)">
          <input type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} min={1} className={inputClass} placeholder="15" />
        </Field>
      </div>
      {type !== 'text' && (
        <Field label="URL du contenu">
          <input type="url" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} className={inputClass} placeholder="https://..." />
        </Field>
      )}
      <Field label="Position">
        <input type="number" value={pos} onChange={(e) => setPos(Number(e.target.value))} min={1} required className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="rounded" />
        Publier
      </label>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading || !title} className="flex-1 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {loading ? 'Sauvegarde...' : 'Créer la leçon'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg transition-colors">
          Annuler
        </button>
      </div>
      {type === 'text' && <p className="text-xs text-gray-400">Le contenu texte s'édite depuis la page de la leçon.</p>}
    </form>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'new-content' }
  | { type: 'edit-content'; content: Content }
  | { type: 'new-week'; contentId: string; nextPosition: number }
  | { type: 'edit-week'; week: Week }
  | { type: 'new-module'; weekId: string; nextPosition: number }
  | { type: 'edit-module'; module: Module }
  | { type: 'new-lesson'; moduleId: string; nextPosition: number }

export default function AdminCurriculumPage() {
  const [contents, setContents] = useState<Content[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [expandedContents, setExpandedContents] = useState<Set<string>>(new Set())
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalState | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setFetchError(null)
    const [cRes, wRes, mRes, lRes] = await Promise.all([
      fetch('/api/admin/contents'),
      fetch('/api/admin/weeks'),
      fetch('/api/admin/modules'),
      fetch('/api/admin/lessons'),
    ])

    if (!wRes.ok) { setFetchError('Erreur de chargement'); return }

    if (cRes.ok) { const cData = await cRes.json(); setContents(cData.contents ?? []) }
    const wData = await wRes.json(); setWeeks(wData.weeks ?? [])
    if (mRes.ok) { const mData = await mRes.json(); setModules(mData.modules ?? []) }
    if (lRes.ok) { const lData = await lRes.json(); setLessons(lData.lessons ?? []) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Content CRUD ──

  async function handleCreateContent(data: Omit<Content, 'id'>) {
    setLoading(true)
    const res = await fetch('/api/admin/contents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { const { content } = await res.json(); setContents((p) => [...p, content].sort((a, b) => a.position - b.position)) }
    setLoading(false)
    setModal(null)
  }

  async function handleUpdateContent(id: string, data: Partial<Omit<Content, 'id'>>) {
    setLoading(true)
    const res = await fetch(`/api/admin/contents/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { const { content } = await res.json(); setContents((p) => p.map((c) => c.id === id ? content : c).sort((a, b) => a.position - b.position)) }
    setLoading(false)
    setModal(null)
  }

  async function handleDeleteContent(id: string) {
    if (!confirm('Supprimer ce contenu et toutes ses semaines/modules/leçons ?')) return
    const res = await fetch(`/api/admin/contents/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setContents((p) => p.filter((c) => c.id !== id))
      const removedWeekIds = weeks.filter((w) => w.content_id === id).map((w) => w.id)
      setWeeks((p) => p.filter((w) => w.content_id !== id))
      setModules((p) => p.filter((m) => !removedWeekIds.includes(m.week_id)))
    }
  }

  // ── Week CRUD ──

  async function handleCreateWeek(data: Omit<Week, 'id'>) {
    setLoading(true)
    const res = await fetch('/api/admin/weeks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { const { week } = await res.json(); setWeeks((p) => [...p, week].sort((a, b) => a.position - b.position)) }
    setLoading(false)
    setModal(null)
  }

  async function handleUpdateWeek(id: string, data: Partial<Omit<Week, 'id'>>) {
    setLoading(true)
    const res = await fetch(`/api/admin/weeks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { const { week } = await res.json(); setWeeks((p) => p.map((w) => w.id === id ? week : w).sort((a, b) => a.position - b.position)) }
    setLoading(false)
    setModal(null)
  }

  async function handleDeleteWeek(id: string) {
    if (!confirm('Supprimer cette semaine et tous ses modules/leçons ?')) return
    const res = await fetch(`/api/admin/weeks/${id}`, { method: 'DELETE' })
    if (res.ok) { setWeeks((p) => p.filter((w) => w.id !== id)); setModules((p) => p.filter((m) => m.week_id !== id)) }
  }

  // ── Module CRUD ──

  async function handleCreateModule(data: Omit<Module, 'id'>) {
    setLoading(true)
    const res = await fetch('/api/admin/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { const { module: mod } = await res.json(); setModules((p) => [...p, mod].sort((a, b) => a.position - b.position)) }
    setLoading(false)
    setModal(null)
  }

  async function handleUpdateModule(id: string, data: Partial<Omit<Module, 'id'>>) {
    setLoading(true)
    const res = await fetch(`/api/admin/modules/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { const { module: mod } = await res.json(); setModules((p) => p.map((m) => m.id === id ? mod : m).sort((a, b) => a.position - b.position)) }
    setLoading(false)
    setModal(null)
  }

  async function handleDeleteModule(id: string) {
    if (!confirm('Supprimer ce module et toutes ses leçons ?')) return
    const res = await fetch(`/api/admin/modules/${id}`, { method: 'DELETE' })
    if (res.ok) { setModules((p) => p.filter((m) => m.id !== id)); setLessons((p) => p.filter((l) => l.module_id !== id)) }
  }

  // ── Lesson CRUD ──

  async function handleCreateLesson(data: Omit<Lesson, 'id'>) {
    setLoading(true)
    const res = await fetch('/api/admin/lessons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { const { lesson } = await res.json(); setLessons((p) => [...p, lesson].sort((a, b) => a.position - b.position)) }
    setLoading(false)
    setModal(null)
  }

  async function handleDeleteLesson(id: string) {
    if (!confirm('Supprimer cette leçon ?')) return
    const res = await fetch(`/api/admin/lessons/${id}`, { method: 'DELETE' })
    if (res.ok) setLessons((p) => p.filter((l) => l.id !== id))
  }

  function toggleContent(id: string) {
    setExpandedContents((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleWeek(id: string) {
    setExpandedWeeks((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleModule(id: string) {
    setExpandedModules((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Curriculum</h1>
          <p className="text-sm text-gray-500 mt-1">{contents.length} contenu{contents.length !== 1 ? 's' : ''} — {weeks.length} semaine{weeks.length !== 1 ? 's' : ''} — {modules.length} module{modules.length !== 1 ? 's' : ''} — {lessons.length} leçon{lessons.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal({ type: 'new-content' })}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Nouveau contenu
        </button>
      </div>

      {fetchError && <p className="text-sm text-red-600 mb-4">{fetchError}</p>}

      {/* Contents > Weeks > Modules > Lessons */}
      <div className="space-y-3">
        {contents.map((content) => {
          const contentWeeks = weeks.filter((w) => w.content_id === content.id).sort((a, b) => a.position - b.position)
          const isContentExpanded = expandedContents.has(content.id)

          return (
            <div key={content.id} className="border-2 border-gray-200 rounded-xl bg-white overflow-hidden">
              {/* Content row */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                <button onClick={() => toggleContent(content.id)} className="flex-shrink-0 text-gray-400 hover:text-gray-700 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`transition-transform ${isContentExpanded ? 'rotate-90' : ''}`}>
                    <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span className="text-xs text-gray-400 w-6 text-center font-mono">{content.position}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{content.title}</p>
                  {content.description && <p className="text-xs text-gray-400 truncate">{content.description}</p>}
                </div>
                <PublishedBadge value={content.is_published} />
                <span className="text-xs text-gray-400">{contentWeeks.length} sem.</span>
                <button onClick={() => setModal({ type: 'new-week', contentId: content.id, nextPosition: contentWeeks.length + 1 })} className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 hover:bg-gray-200 rounded transition-colors">+ Semaine</button>
                <button onClick={() => setModal({ type: 'edit-content', content })} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 hover:bg-gray-200 rounded transition-colors">Éditer</button>
                <button onClick={() => handleDeleteContent(content.id)} className="text-xs text-red-400 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded transition-colors">Suppr.</button>
              </div>

              {/* Weeks inside content */}
              {isContentExpanded && (
                <div className="divide-y divide-gray-100">
                  {contentWeeks.map((week) => {
                    const weekModules = modules.filter((m) => m.week_id === week.id).sort((a, b) => a.position - b.position)
                    const isExpanded = expandedWeeks.has(week.id)

                    return (
                      <div key={week.id} className="bg-white">
                        {/* Week row */}
                        <div className="flex items-center gap-3 pl-8 pr-4 py-3">
                          <button onClick={() => toggleWeek(week.id)} className="flex-shrink-0 text-gray-400 hover:text-gray-700 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                              <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <span className="text-xs text-gray-400 w-6 text-center font-mono">{week.position}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{week.title}</p>
                            {week.description && <p className="text-xs text-gray-400 truncate">{week.description}</p>}
                          </div>
                          <PublishedBadge value={week.is_published} />
                          <span className="text-xs text-gray-400">{weekModules.length} mod.</span>
                          <button onClick={() => setModal({ type: 'edit-week', week })} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded transition-colors">Éditer</button>
                          <button onClick={() => handleDeleteWeek(week.id)} className="text-xs text-red-400 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded transition-colors">Suppr.</button>
                        </div>

                        {/* Modules */}
                        {isExpanded && (
                          <div className="border-t border-gray-100">
                            {weekModules.map((mod) => {
                              const modLessons = lessons.filter((l) => l.module_id === mod.id).sort((a, b) => a.position - b.position)
                              const isModExpanded = expandedModules.has(mod.id)
                              return (
                                <div key={mod.id} className="border-b border-gray-100 last:border-b-0">
                                  <div className="flex items-center gap-3 pl-16 pr-4 py-2.5 bg-gray-50">
                                    <button onClick={() => toggleModule(mod.id)} className="flex-shrink-0 text-gray-400 hover:text-gray-700 transition-colors">
                                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className={`transition-transform ${isModExpanded ? 'rotate-90' : ''}`}>
                                        <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </button>
                                    <span className="text-xs text-gray-400 w-4 text-center font-mono">{mod.position}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-800 truncate">{mod.title}</p>
                                      <p className="text-xs text-gray-400 font-mono truncate">{mod.slug}</p>
                                    </div>
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${mod.required_plan === 'pro' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>{mod.required_plan}</span>
                                    <PublishedBadge value={mod.is_published} />
                                    <span className="text-xs text-gray-400">{modLessons.length} leç.</span>
                                    <button onClick={() => setModal({ type: 'edit-module', module: mod })} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 hover:bg-gray-200 rounded transition-colors">Éditer</button>
                                    <button onClick={() => handleDeleteModule(mod.id)} className="text-xs text-red-400 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded transition-colors">Suppr.</button>
                                  </div>
                                  {isModExpanded && (
                                    <div className="bg-white">
                                      {modLessons.map((lesson) => (
                                        <div key={lesson.id} className="flex items-center gap-3 pl-20 pr-4 py-2 border-t border-gray-100 hover:bg-gray-50 group">
                                          <span className="text-xs text-gray-400 w-4 text-center font-mono">{lesson.position}</span>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-700 truncate">{lesson.title}</p>
                                          </div>
                                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{LESSON_TYPE_LABELS[lesson.type]}</span>
                                          {lesson.estimated_minutes && <span className="text-xs text-gray-400">{lesson.estimated_minutes} min</span>}
                                          <PublishedBadge value={lesson.is_published} />
                                          <Link href={`/admin/curriculum/lessons/${lesson.id}`} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded transition-colors">Éditer</Link>
                                          <button onClick={() => handleDeleteLesson(lesson.id)} className="text-xs text-red-400 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100">Suppr.</button>
                                        </div>
                                      ))}
                                      <div className="pl-20 pr-4 py-2 border-t border-gray-100">
                                        <button onClick={() => setModal({ type: 'new-lesson', moduleId: mod.id, nextPosition: modLessons.length + 1 })} className="text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
                                          + Nouvelle leçon
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            <div className="pl-16 pr-4 py-2.5 bg-gray-50 border-t border-gray-100">
                              <button onClick={() => setModal({ type: 'new-module', weekId: week.id, nextPosition: weekModules.length + 1 })} className="text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                                + Nouveau module
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {contents.length === 0 && !fetchError && (
          <div className="text-center py-16 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
            Aucun contenu. Commence par créer le premier.
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'new-content' && (
        <Modal title="Nouveau contenu" onClose={() => setModal(null)}>
          <ContentForm initial={{ position: contents.length + 1 }} onSave={handleCreateContent} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.type === 'edit-content' && (
        <Modal title="Modifier le contenu" onClose={() => setModal(null)}>
          <ContentForm initial={modal.content} onSave={(d) => handleUpdateContent(modal.content.id, d)} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.type === 'new-week' && (
        <Modal title="Nouvelle semaine" onClose={() => setModal(null)}>
          <WeekForm contentId={modal.contentId} initial={{ position: modal.nextPosition }} onSave={handleCreateWeek} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.type === 'edit-week' && (
        <Modal title="Modifier la semaine" onClose={() => setModal(null)}>
          <WeekForm contentId={modal.week.content_id ?? ''} initial={modal.week} onSave={(d) => handleUpdateWeek(modal.week.id, d)} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.type === 'new-module' && (
        <Modal title="Nouveau module" onClose={() => setModal(null)}>
          <ModuleForm weekId={modal.weekId} position={modal.nextPosition} onSave={handleCreateModule} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.type === 'edit-module' && (
        <Modal title="Modifier le module" onClose={() => setModal(null)}>
          <ModuleForm weekId={modal.module.week_id} initial={modal.module} position={modal.module.position} onSave={(d) => handleUpdateModule(modal.module.id, d)} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
      {modal?.type === 'new-lesson' && (
        <Modal title="Nouvelle leçon" onClose={() => setModal(null)}>
          <LessonForm moduleId={modal.moduleId} position={modal.nextPosition} onSave={handleCreateLesson} onCancel={() => setModal(null)} loading={loading} />
        </Modal>
      )}
    </div>
  )
}
