import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserActivePlan, canAccessPracticeMode } from '@/lib/utils/access'
import ProjectList from '@/components/practice/ProjectList'
import type { Project } from '@/lib/utils/types'

export default async function PracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const plan = await getUserActivePlan(user.id)
  if (!canAccessPracticeMode(plan)) redirect('/dashboard')

  const result = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .not('status', 'in', '("archived","deleted")')
    .order('updated_at', { ascending: false })

  const projects = result.data as Project[] | null ?? []

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Mes projets</h1>
            <p className="text-sm text-gray-500 mt-1">Pratique projet — travaille sur de vrais projets avec des agents IA.</p>
          </div>
          <Link
            href="/practice/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
          >
            + Nouveau projet
          </Link>
        </div>

        <ProjectList projects={projects} />
      </div>
    </div>
  )
}
