import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserActivePlans, canAccessPracticeMode } from '@/lib/utils/access'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const plans = await getUserActivePlans(user.id)
  const primaryPlan = plans[0] ?? null
  const hasPractice = canAccessPracticeMode(primaryPlan)

  if (!hasPractice) redirect('/learn')

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Bonjour 👋</h1>
        <p className="text-gray-500 text-sm mb-10">Que veux-tu faire aujourd'hui ?</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/learn"
            className="group p-6 border border-gray-200 rounded-2xl hover:border-gray-400 transition-colors"
          >
            <div className="text-2xl mb-3">📚</div>
            <h2 className="font-semibold text-gray-900 mb-1">Supports de cours</h2>
            <p className="text-sm text-gray-500">
              Suis le curriculum structuré semaine par semaine et développe tes compétences sur Figma.
            </p>
          </Link>

          <Link
            href="/practice"
            className="group p-6 border border-gray-200 rounded-2xl hover:border-gray-400 transition-colors"
          >
            <div className="text-2xl mb-3">🛠️</div>
            <h2 className="font-semibold text-gray-900 mb-1">Pratique projet</h2>
            <p className="text-sm text-gray-500">
              Travaille sur tes projets avec des agents IA spécialisés.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
