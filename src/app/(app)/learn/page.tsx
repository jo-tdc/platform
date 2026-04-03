import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserActivePlan, canAccessLearnMode, canAccessModule } from '@/lib/utils/access'
import type { PlanType } from '@/lib/utils/types'

type WeekRow = {
  id: string
  position: number
  title: string
  description: string | null
}

type ModuleRow = {
  id: string
  week_id: string
  position: number
  title: string
  slug: string
  description: string | null
  required_plan: 'free' | 'pro'
  preview_url: string | null
  figma_url: string | null
  is_published: boolean
}

type Props = {
  searchParams: Promise<{ week?: string }>
}

export default async function LearnPage({ searchParams }: Props) {
  const { week: weekParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const plan = await getUserActivePlan(user.id)
  if (!canAccessLearnMode(plan)) redirect('/dashboard')

  const weeksResult = await supabase
    .from('weeks')
    .select('id, position, title, description')
    .eq('is_published', true)
    .order('position')

  const weeks = weeksResult.data as WeekRow[] | null ?? []

  if (weeks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Le curriculum sera bientôt disponible.</p>
      </div>
    )
  }

  const activeWeek = weeks.find((w) => w.id === weekParam) ?? weeks[0]

  const modulesResult = await supabase
    .from('modules')
    .select('id, week_id, position, title, slug, description, required_plan, preview_url, figma_url, is_published')
    .eq('week_id', activeWeek.id)
    .eq('is_published', true)
    .order('position')

  const modules = modulesResult.data as ModuleRow[] | null ?? []

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar — semaines */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
        <div className="p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Semaines</p>
          <div className="space-y-1">
            {weeks.map((week) => {
              const isActive = week.id === activeWeek.id
              return (
                <Link
                  key={week.id}
                  href={`/learn?week=${week.id}`}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className={`text-xs font-mono mt-0.5 flex-shrink-0 ${isActive ? 'text-gray-400' : 'text-gray-400'}`}>
                    S{week.position}
                  </span>
                  <span className="text-sm font-medium leading-snug">{week.title}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </aside>

      {/* Main — module cards */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-900">
              Semaine {activeWeek.position} — {activeWeek.title}
            </h1>
            {activeWeek.description && (
              <p className="text-sm text-gray-500 mt-1">{activeWeek.description}</p>
            )}
          </div>

          {modules.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun module disponible pour cette semaine.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((mod, idx) => {
                const isLocked = !canAccessModule(plan as PlanType, mod.required_plan)
                const href = `/learn/${activeWeek.id}/${mod.slug}`

                return (
                  <div
                    key={mod.id}
                    className={`group relative bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow ${
                      isLocked ? 'opacity-60' : 'hover:shadow-md cursor-pointer'
                    }`}
                  >
                    {/* Preview image */}
                    <div className="aspect-video bg-gray-100 overflow-hidden relative">
                      {mod.preview_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mod.preview_url}
                          alt={mod.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-gray-300">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        </div>
                      )}

                      {/* Position badge */}
                      <span className="absolute top-2 left-2 text-xs font-semibold bg-black/60 text-white px-2 py-0.5 rounded-full">
                        {idx + 1}
                      </span>

                      {/* Lock overlay */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <span className="text-2xl">🔒</span>
                        </div>
                      )}

                      {/* Pro badge */}
                      {mod.required_plan === 'pro' && (
                        <span className="absolute top-2 right-2 text-xs font-semibold bg-purple-600 text-white px-2 py-0.5 rounded-full">
                          Pro
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{mod.title}</h3>
                      {mod.description && (
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{mod.description}</p>
                      )}
                    </div>

                    {/* Clickable overlay */}
                    {!isLocked && (
                      <Link href={href} className="absolute inset-0" aria-label={mod.title} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
