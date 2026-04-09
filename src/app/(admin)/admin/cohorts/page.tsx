'use client'

import { useEffect, useRef, useState } from 'react'

type PlanValue = 'free' | 'trial' | 'bootcamp' | 'pro' | 'editor' | 'admin' | 'starter_pack'

const PLANS: { value: PlanValue; label: string; color: string }[] = [
  { value: 'free',         label: 'Free',         color: 'bg-gray-100 text-gray-600' },
  { value: 'trial',        label: 'Trial',        color: 'bg-yellow-50 text-yellow-700' },
  { value: 'starter_pack', label: 'Starter Pack', color: 'bg-green-50 text-green-700' },
  { value: 'bootcamp',     label: 'Bootcamp',     color: 'bg-blue-50 text-blue-700' },
  { value: 'pro',          label: 'Pro',          color: 'bg-purple-50 text-purple-700' },
  { value: 'editor',       label: 'Editor',       color: 'bg-orange-50 text-orange-700' },
  { value: 'admin',        label: 'Admin',        color: 'bg-red-50 text-red-700' },
]

type Cohort = { id: string; name: string; batch_number: number | null; is_open: boolean }

type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  plan: PlanValue | null
  plans: PlanValue[]
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

function PlanModal({ userId, currentPlans, onChanged, onClose }: {
  userId: string
  currentPlans: PlanValue[]
  onChanged: (plans: PlanValue[]) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<PlanValue[]>(currentPlans)
  const [saving, setSaving] = useState(false)

  function toggle(plan: PlanValue) {
    setSelected((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan]
    )
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/admin/users/${userId}/plans`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plans: selected }),
    })
    if (res.ok) {
      onChanged(selected)
      onClose()
    } else {
      const data = await res.json()
      alert(`Erreur : ${data.error ?? 'Impossible de sauvegarder'}`)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xs mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Modifier les plans</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="px-5 py-3 space-y-1">
          {PLANS.map((p) => (
            <label key={p.value} className="flex items-center gap-3 py-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selected.includes(p.value)}
                onChange={() => toggle(p.value)}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.color}`}>
                {p.label}
              </span>
            </label>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
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
  const [emailSent, setEmailSent] = useState(false)
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
    setEmailSent(data.emailSent ?? false)
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
                  <option key={c.id} value={c.id}>
                    {c.batch_number != null ? `Batch ${c.batch_number}` : c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          {emailSent ? (
            <div className="space-y-3">
              <p className="text-xs text-green-700 font-medium">Compte créé. Un email de connexion a été envoyé à {email}.</p>
              <button type="button" onClick={onClose} className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                Fermer
              </button>
            </div>
          ) : accessLink ? (
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

type TabId = 'all' | 'bootcamp' | 'starter_pack'

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'bootcamp', label: 'Bootcamp' },
  { id: 'starter_pack', label: 'Starter Pack' },
]

export default function AdminCohortsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [showInvite, setShowInvite] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [planModalUserId, setPlanModalUserId] = useState<string | null>(null)

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

  function handlePlansChanged(userId: string, plans: PlanValue[]) {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, plans, plan: plans[0] ?? null } : u))
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`Supprimer le compte de ${email} ? Cette action est irréversible.`)) return
    setDeletingId(userId)
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    setDeletingId(null)
  }

  const tabFiltered = users.filter((u) => {
    if (activeTab === 'bootcamp') return u.plans.includes('bootcamp')
    if (activeTab === 'starter_pack') return u.plans.includes('starter_pack')
    return true
  })

  const filtered = tabFiltered.filter((u) =>
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

      {/* Onglets */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map((tab) => {
          const count = tab.id === 'all'
            ? users.length
            : users.filter((u) => u.plans.includes(tab.id as PlanValue)).length
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
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
                    <button
                      onClick={() => setPlanModalUserId(u.id)}
                      className="flex items-center gap-1.5 flex-wrap hover:opacity-75 transition-opacity text-left"
                    >
                      {u.plans.length === 0
                        ? <span className="text-xs text-gray-400 italic">aucun</span>
                        : u.plans.map((p) => <PlanBadge key={p} plan={p} />)
                      }
                    </button>
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

      {planModalUserId && (() => {
        const u = users.find((u) => u.id === planModalUserId)
        if (!u) return null
        return (
          <PlanModal
            userId={u.id}
            currentPlans={u.plans}
            onChanged={(plans) => handlePlansChanged(u.id, plans)}
            onClose={() => setPlanModalUserId(null)}
          />
        )
      })()}
    </div>
  )
}
