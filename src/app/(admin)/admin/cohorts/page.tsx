'use client'

import { useEffect, useRef, useState } from 'react'

type PlanValue = 'free' | 'trial' | 'bootcamp' | 'pro' | 'editor' | 'admin'

const PLANS: { value: PlanValue; label: string; color: string }[] = [
  { value: 'free',      label: 'Free',      color: 'bg-gray-100 text-gray-600' },
  { value: 'trial',     label: 'Trial',     color: 'bg-yellow-50 text-yellow-700' },
  { value: 'bootcamp',  label: 'Bootcamp',  color: 'bg-blue-50 text-blue-700' },
  { value: 'pro',       label: 'Pro',       color: 'bg-purple-50 text-purple-700' },
  { value: 'editor',    label: 'Editor',    color: 'bg-orange-50 text-orange-700' },
  { value: 'admin',     label: 'Admin',     color: 'bg-red-50 text-red-700' },
]

type Cohort = { id: string; name: string; is_open: boolean }

type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  plan: PlanValue | null
  cohort_id: string | null
  cohort_name: string | null
}

function PlanBadge({ plan }: { plan: PlanValue | null }) {
  const found = PLANS.find((p) => p.value === plan)
  if (!found) return <span className="text-xs text-gray-400 italic">aucun</span>
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${found.color}`}>
      {found.label}
    </span>
  )
}

function PlanDropdown({ userId, current, onChanged }: { userId: string; current: PlanValue | null; onChanged: (plan: PlanValue) => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen((v) => !v)
  }

  async function handleSelect(plan: PlanValue) {
    if (plan === current) { setOpen(false); return }
    setSaving(true)
    setOpen(false)
    await fetch(`/api/admin/users/${userId}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    onChanged(plan)
    setSaving(false)
  }

  return (
    <div>
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={saving}
        className="flex items-center gap-1.5 disabled:opacity-50"
      >
        <PlanBadge plan={current} />
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-400">
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[120px]"
            style={{ top: dropPos.top, left: dropPos.left }}
          >
            {PLANS.map((p) => (
              <button
                key={p.value}
                onClick={() => handleSelect(p.value)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-gray-50 ${p.value === current ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function InviteModal({ cohorts, onClose, onInvited }: { cohorts: Cohort[]; onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState<PlanValue>('bootcamp')
  const [cohortId, setCohortId] = useState<string>(cohorts[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessLink, setAccessLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setAccessLink(null)

    const body: Record<string, string> = { email, plan }
    if (plan === 'bootcamp' && cohortId) body.cohortId = cohortId

    const res = await fetch('/api/admin/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? 'Erreur inconnue'); return }

    setAccessLink(data.accessLink ?? null)
    onInvited()
  }

  async function copyLink() {
    if (!accessLink) return
    await navigator.clipboard.writeText(accessLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-900">Inviter un utilisateur</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="etudiant@email.com"
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as PlanValue)}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            >
              {PLANS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {plan === 'bootcamp' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Batch</label>
              <select
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                {cohorts.length === 0 ? (
                  <option value="">Aucun batch disponible</option>
                ) : cohorts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          {accessLink ? (
            <div className="space-y-3">
              <p className="text-xs text-green-700 font-medium">Compte créé. Partage ce lien de connexion :</p>
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600 truncate flex-1">{accessLink}</p>
                <button type="button" onClick={copyLink} className="flex-shrink-0 text-xs font-medium text-gray-900 hover:text-gray-600 transition-colors">
                  {copied ? '✓ Copié' : 'Copier'}
                </button>
              </div>
              <p className="text-xs text-gray-400">Ce lien est à usage unique et expire dans 24h.</p>
              <button type="button" onClick={onClose} className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                Fermer
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading || (plan === 'bootcamp' && !cohortId)}
              className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Création…' : 'Créer le compte'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

export default function AdminCohortsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadAll() {
    const [usersRes, cohortsRes] = await Promise.all([
      fetch('/api/admin/users').then((r) => r.json()),
      fetch('/api/admin/cohorts').then((r) => r.json()),
    ])
    if (usersRes.users) setUsers(usersRes.users)
    if (cohortsRes.cohorts) setCohorts(cohortsRes.cohorts)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  function handlePlanChanged(userId: string, plan: PlanValue) {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, plan } : u))
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`Supprimer le compte de ${email} ? Cette action est irréversible.`)) return
    setDeletingId(userId)
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    setDeletingId(null)
  }

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} compte{users.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Inviter
        </button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par email…"
          className="w-full max-w-sm px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Batch</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Inscrit le</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dernière connexion</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-xs">Aucun utilisateur trouvé.</td>
                </tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-900 font-medium">{u.email}</td>
                  <td className="px-4 py-3">
                    <PlanDropdown userId={u.id} current={u.plan} onChanged={(plan) => handlePlanChanged(u.id, plan)} />
                  </td>
                  <td className="px-4 py-3">
                    {u.cohort_name
                      ? <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{u.cohort_name}</span>
                      : <span className="text-xs text-gray-300 italic">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="italic text-gray-300">jamais</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(u.id, u.email)}
                      disabled={deletingId === u.id}
                      className="text-xs text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      {deletingId === u.id ? '…' : 'Supprimer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && (
        <InviteModal
          cohorts={cohorts}
          onClose={() => setShowInvite(false)}
          onInvited={loadAll}
        />
      )}
    </div>
  )
}
