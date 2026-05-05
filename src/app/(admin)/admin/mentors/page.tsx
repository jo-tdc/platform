'use client'

import { useState, useEffect, useRef } from 'react'

type Mentor = {
  id: string
  first_name: string
  job_title: string | null
  photo_url: string | null
}

function MentorModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Mentor
  onClose: () => void
  onSaved: (mentor: Mentor) => void
}) {
  const [firstName, setFirstName] = useState(initial?.first_name ?? '')
  const [jobTitle, setJobTitle] = useState(initial?.job_title ?? '')
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('photo', file)
    const res = await fetch('/api/admin/mentors/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { setError(data.error); return }
    setPhotoUrl(data.url)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const url = initial ? `/api/admin/mentors/${initial.id}` : '/api/admin/mentors'
    const method = initial ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: firstName, job_title: jobTitle || null, photo_url: photoUrl || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    onSaved(data.mentor)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{initial ? 'Modifier le mentor' : 'Ajouter un mentor'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="px-5 py-4 space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Upload…' : 'Choisir une photo'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Job title</label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="ex. Product Designer"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminMentorsPage() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | Mentor | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/admin/mentors')
    const data = await res.json()
    if (data.mentors) setMentors(data.mentors)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleSaved(mentor: Mentor) {
    setMentors((prev) => {
      const idx = prev.findIndex((m) => m.id === mentor.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = mentor
        return next
      }
      return [...prev, mentor]
    })
    setModal(null)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer ${name} ? Cette action est irréversible.`)) return
    setDeletingId(id)
    await fetch(`/api/admin/mentors/${id}`, { method: 'DELETE' })
    setMentors((prev) => prev.filter((m) => m.id !== id))
    setDeletingId(null)
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mentors</h1>
          <p className="text-sm text-gray-500 mt-0.5">{mentors.length} mentor{mentors.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : mentors.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">Aucun mentor pour l&apos;instant.</p>
          <button onClick={() => setModal('create')} className="mt-3 text-sm text-gray-900 font-medium hover:underline">
            Ajouter le premier mentor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {mentors.map((mentor) => (
            <div key={mentor.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                {mentor.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mentor.photo_url} alt={mentor.first_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-semibold">
                    {mentor.first_name[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{mentor.first_name}</p>
                {mentor.job_title && <p className="text-xs text-gray-500 mt-0.5">{mentor.job_title}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModal(mentor)}
                  className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(mentor.id, mentor.first_name)}
                  disabled={deletingId === mentor.id}
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {deletingId === mentor.id ? '…' : 'Supprimer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <MentorModal
          initial={modal === 'create' ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
