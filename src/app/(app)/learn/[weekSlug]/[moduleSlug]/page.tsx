import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getUserActivePlan, canAccessModule } from '@/lib/utils/access'
import type { PlanType } from '@/lib/utils/types'
import FigmaViewer from '@/components/learn/FigmaViewer'

type Props = {
  params: Promise<{ weekSlug: string; moduleSlug: string }>
}

type ModuleRow = {
  id: string
  title: string
  description: string | null
  required_plan: 'free' | 'pro'
  figma_url: string | null
  week_id: string
}

export default async function ModulePage({ params }: Props) {
  const { weekSlug, moduleSlug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const modResult = await supabase
    .from('modules')
    .select('id, title, description, required_plan, figma_url, week_id')
    .eq('slug', moduleSlug)
    .eq('is_published', true)
    .limit(1)

  const module = (modResult.data as ModuleRow[] | null)?.[0]
  if (!module || module.week_id !== weekSlug) notFound()

  const plan = await getUserActivePlan(user.id)
  if (!canAccessModule(plan as PlanType, module.required_plan)) redirect('/learn')

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-950">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <a
          href={`/learn`}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Curriculum
        </a>
        <div className="w-px h-4 bg-gray-700" />
        <h1 className="text-sm font-medium text-white truncate">{module.title}</h1>
        {module.figma_url && (
          <a
            href={module.figma_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M5 2H2v8h8V7M7 1h4m0 0v4m0-4L5.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ouvrir dans Figma
          </a>
        )}
      </header>

      {/* Figma embed */}
      <div className="flex-1 overflow-hidden">
        {module.figma_url ? (
          <FigmaViewer url={module.figma_url} title={module.title} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">Aucune présentation Figma associée à ce module.</p>
          </div>
        )}
      </div>
    </div>
  )
}
