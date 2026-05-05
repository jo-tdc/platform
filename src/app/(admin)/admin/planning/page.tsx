'use client'

import { useState, useEffect } from 'react'

type Cohort = { id: string; name: string; batch_number: number | null }
type Mentor = { id: string; first_name: string; job_title: string | null; photo_url: string | null }
type Schedule = { id: string; cohort_id: string; starts_at: string; ends_at: string }
type Block = {
  id: string
  schedule_id: string
  date: string
  period: 'morning' | 'afternoon'
  type: 'theory' | 'practice'
  title: string
  mentor_id: string | null
  mentors: Mentor | null
}

const DAYS_FR = ['LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.']
const PERIODS: { key: 'morning' | 'afternoon'; label: string }[] = [
  { key: 'morning', label: 'Matinée' },
  { key: 'afternoon', label: 'Après-midi' },
]

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function BlockModal({
  scheduleId,
  date,
  period,
  existing,
  mentors,
  onClose,
  onSaved,
  onDeleted,
}: {
  scheduleId: string
  date: string
  period: 'morning' | 'afternoon'
  existing: Block | null
  mentors: Mentor[]
  onClose: () => void
  onSaved: (block: Block) => void
  onDeleted: (id: string) => void
}) {
  const [type, setType] = useState<'theory' | 'practice'>(existing?.type ?? 'theory')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [mentorId, setMentorId] = useState(existing?.mentor_id ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const url = existing ? `/api/admin/schedule-blocks/${existing.id}` : '/api/admin/schedule-blocks'
    const method = existing ? 'PUT' : 'POST'
    const body = existing
      ? { type, title, mentor_id: mentorId || null }
      : { schedule_id: scheduleId, date, period, type, title, mentor_id: mentorId || null }
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    onSaved(data.block)
  }

  async function handleDelete() {
    if (!existing || !confirm('Supprimer ce bloc ?')) return
    setDeleting(true)
    await fetch(`/api/admin/schedule-blocks/${existing.id}`, { method: 'DELETE' })
    onDeleted(existing.id)
  }

  const periodLabel = period === 'morning' ? 'Matinée' : 'Après-midi'
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{existing ? 'Modifier le bloc' : 'Ajouter un bloc'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{dateLabel} — {periodLabel}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
            <div className="flex gap-2">
              {(['theory', 'practice'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    type === t
                      ? t === 'theory' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-green-50 border-green-300 text-green-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {t === 'theory' ? 'Théorie' : 'Pratique'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Titre *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="ex. Introduction au Product Design"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mentor</label>
            <select
              value={mentorId}
              onChange={(e) => setMentorId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            >
              <option value="">— Aucun mentor —</option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name}{m.job_title ? ` — ${m.job_title}` : ''}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            {existing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {deleting ? '…' : 'Supprimer'}
              </button>
            )}
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {saving ? '…' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminPlanningPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [selectedCohortId, setSelectedCohortId] = useState('')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()))
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newStartsAt, setNewStartsAt] = useState('')
  const [newEndsAt, setNewEndsAt] = useState('')
  const [editingDates, setEditingDates] = useState(false)
  const [editStartsAt, setEditStartsAt] = useState('')
  const [editEndsAt, setEditEndsAt] = useState('')
  const [modal, setModal] = useState<{ date: string; period: 'morning' | 'afternoon'; block: Block | null } | null>(null)
  const [savingDates, setSavingDates] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/cohorts').then((r) => r.json()),
      fetch('/api/admin/mentors').then((r) => r.json()),
    ]).then(([cd, md]) => {
      if (cd.cohorts) setCohorts(cd.cohorts)
      if (md.mentors) setMentors(md.mentors)
    })
  }, [])

  useEffect(() => {
    if (!selectedCohortId) { setSchedule(null); setBlocks([]); return }
    setLoading(true)
    fetch('/api/admin/schedules')
      .then((r) => r.json())
      .then(({ schedules }) => {
        const found = (schedules ?? []).find((s: Schedule & { cohorts: unknown }) => s.cohort_id === selectedCohortId) ?? null
        setSchedule(found)
        if (found) {
          setWeekStart(getMonday(new Date(found.starts_at + 'T12:00:00')))
          return fetch(`/api/admin/schedule-blocks?scheduleId=${found.id}`).then((r) => r.json())
        }
        return { blocks: [] }
      })
      .then(({ blocks: b }) => { setBlocks(b ?? []); setLoading(false) })
  }, [selectedCohortId])

  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/admin/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohort_id: selectedCohortId, starts_at: newStartsAt, ends_at: newEndsAt }),
    })
    const data = await res.json()
    setCreating(false)
    if (res.ok) {
      setSchedule(data.schedule)
      setWeekStart(getMonday(new Date(data.schedule.starts_at + 'T12:00:00')))
      setBlocks([])
    }
  }

  async function handleSaveDates(e: React.FormEvent) {
    e.preventDefault()
    if (!schedule) return
    setSavingDates(true)
    const res = await fetch(`/api/admin/schedules/${schedule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starts_at: editStartsAt, ends_at: editEndsAt }),
    })
    const data = await res.json()
    setSavingDates(false)
    if (res.ok) { setSchedule(data.schedule); setEditingDates(false) }
  }

  function handleBlockSaved(block: Block) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === block.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = block; return next }
      return [...prev, block]
    })
    setModal(null)
  }

  function handleBlockDeleted(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    setModal(null)
  }

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
  const scheduleStart = schedule ? new Date(schedule.starts_at + 'T00:00:00') : null
  const scheduleEnd = schedule ? new Date(schedule.ends_at + 'T23:59:59') : null

  function getBlock(date: Date, period: 'morning' | 'afternoon'): Block | null {
    const ds = toISODate(date)
    return blocks.find((b) => b.date === ds && b.period === period) ?? null
  }

  function isInRange(date: Date): boolean {
    if (!scheduleStart || !scheduleEnd) return false
    return date >= scheduleStart && date <= scheduleEnd
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Planning</h1>
      </div>

      {/* Sélecteur de batch */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-gray-700">Batch :</label>
        <select
          value={selectedCohortId}
          onChange={(e) => { setSelectedCohortId(e.target.value); setEditingDates(false) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="">— Sélectionner un batch —</option>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.batch_number != null ? `Batch ${c.batch_number}` : c.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCohortId && (
        <>
          {loading ? (
            <p className="text-sm text-gray-400">Chargement…</p>
          ) : !schedule ? (
            /* Créer le planning */
            <div className="max-w-sm border border-dashed border-gray-200 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Créer le planning</h2>
              <form onSubmit={handleCreateSchedule} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date de début *</label>
                  <input type="date" required value={newStartsAt} onChange={(e) => setNewStartsAt(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date de fin *</label>
                  <input type="date" required value={newEndsAt} onChange={(e) => setNewEndsAt(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
                <button type="submit" disabled={creating}
                  className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {creating ? 'Création…' : 'Créer le planning'}
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Header planning */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {editingDates ? (
                    <form onSubmit={handleSaveDates} className="flex items-center gap-2">
                      <input type="date" value={editStartsAt} onChange={(e) => setEditStartsAt(e.target.value)} required
                        className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                      <span className="text-xs text-gray-400">→</span>
                      <input type="date" value={editEndsAt} onChange={(e) => setEditEndsAt(e.target.value)} required
                        className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                      <button type="submit" disabled={savingDates} className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                        {savingDates ? '…' : 'OK'}
                      </button>
                      <button type="button" onClick={() => setEditingDates(false)} className="text-xs text-gray-400 hover:text-gray-600">Annuler</button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {new Date(schedule.starts_at + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {' → '}
                        {new Date(schedule.ends_at + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => { setEditStartsAt(schedule.starts_at); setEditEndsAt(schedule.ends_at); setEditingDates(true) }}
                        className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        Modifier les dates
                      </button>
                    </div>
                  )}
                </div>

                {/* Navigation semaines */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWeekStart(addDays(weekStart, -7))}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <span className="text-xs font-medium text-gray-700 min-w-[120px] text-center">
                    {formatDay(weekDays[0])} — {formatDay(weekDays[4])}
                  </span>
                  <button
                    onClick={() => setWeekStart(addDays(weekStart, 7))}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>

              {/* Calendrier */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Header jours */}
                <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-gray-100">
                  <div />
                  {weekDays.map((day, i) => (
                    <div key={i} className="p-3 text-center border-l border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{DAYS_FR[i]}</p>
                      <p className="text-lg font-semibold text-gray-900 mt-0.5">{day.getDate()}</p>
                    </div>
                  ))}
                </div>

                {/* Lignes demi-journées */}
                {PERIODS.map((period) => (
                  <div key={period.key} className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-gray-100 last:border-0 min-h-[100px]">
                    <div className="p-3 border-r border-gray-100 flex items-center">
                      <span className="text-xs font-medium text-gray-400">{period.label}</span>
                    </div>
                    {weekDays.map((day, i) => {
                      const inRange = isInRange(day)
                      const block = getBlock(day, period.key)
                      return (
                        <div
                          key={i}
                          className={`border-l border-gray-100 p-2 ${inRange ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50/50'} transition-colors`}
                          onClick={() => inRange && setModal({ date: toISODate(day), period: period.key, block })}
                        >
                          {block ? (
                            <div className={`p-2 rounded-lg border ${block.type === 'theory' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                              <span className={`text-[10px] font-semibold uppercase tracking-wide ${block.type === 'theory' ? 'text-blue-600' : 'text-green-600'}`}>
                                {block.type === 'theory' ? 'Théorie' : 'Pratique'}
                              </span>
                              <p className="text-xs font-medium text-gray-900 mt-0.5 leading-snug">{block.title}</p>
                              {block.mentors && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  {block.mentors.photo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={block.mentors.photo_url} alt={block.mentors.first_name} className="w-4 h-4 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-semibold text-gray-500">
                                      {block.mentors.first_name[0]}
                                    </div>
                                  )}
                                  <span className="text-[10px] text-gray-500">{block.mentors.first_name}</span>
                                </div>
                              )}
                            </div>
                          ) : inRange ? (
                            <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <span className="text-xs text-gray-400">+ Ajouter</span>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {modal && schedule && (
        <BlockModal
          scheduleId={schedule.id}
          date={modal.date}
          period={modal.period}
          existing={modal.block}
          mentors={mentors}
          onClose={() => setModal(null)}
          onSaved={handleBlockSaved}
          onDeleted={handleBlockDeleted}
        />
      )}
    </div>
  )
}
