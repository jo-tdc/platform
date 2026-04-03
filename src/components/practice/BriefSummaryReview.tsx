'use client'

type Props = {
  summary: string
  onConfirm: () => void
  onRegenerate: () => void
  loading?: boolean
}

export default function BriefSummaryReview({ summary, onConfirm, onRegenerate, loading = false }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Brief généré</h3>
        <p className="text-xs text-gray-500 mb-4">
          Vérifie que ce brief capture bien l'essence de ton projet. Tu pourras le modifier plus tard.
        </p>

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {summary}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Regénérer
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Création...' : 'Créer le projet →'}
        </button>
      </div>
    </div>
  )
}
