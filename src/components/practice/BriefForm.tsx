'use client'

import { useState } from 'react'

export type BriefFormData = {
  name: string
  problem: string
  targetUsers: string
  goals: string
  constraints: string
  scope: string
}

type Props = {
  onSubmit: (data: BriefFormData) => void
  loading?: boolean
}

export default function BriefForm({ onSubmit, loading = false }: Props) {
  const [form, setForm] = useState<BriefFormData>({
    name: '',
    problem: '',
    targetUsers: '',
    goals: '',
    constraints: '',
    scope: '',
  })

  function set(field: keyof BriefFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  const isValid = form.name.trim() && form.problem.trim() && form.targetUsers.trim()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom du projet <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={set('name')}
          required
          placeholder="Ex : Redesign de l'onboarding Figma"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Problème / Opportunité <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.problem}
          onChange={set('problem')}
          required
          rows={3}
          placeholder="Quel problème veux-tu résoudre ? Quelle opportunité veux-tu saisir ?"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Utilisateurs cibles <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.targetUsers}
          onChange={set('targetUsers')}
          required
          rows={2}
          placeholder="Qui sont les utilisateurs ? Quels sont leurs besoins et contextes ?"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Objectifs du projet
        </label>
        <textarea
          value={form.goals}
          onChange={set('goals')}
          rows={2}
          placeholder="Quels sont les objectifs mesurables ?"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contraintes & contexte
        </label>
        <textarea
          value={form.constraints}
          onChange={set('constraints')}
          rows={2}
          placeholder="Contraintes techniques, business, temporelles, budgétaires..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Périmètre
        </label>
        <textarea
          value={form.scope}
          onChange={set('scope')}
          rows={2}
          placeholder="Ce qui est dans le scope / hors scope"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={!isValid || loading}
        className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Génération du brief...' : 'Générer le brief →'}
      </button>
    </form>
  )
}
