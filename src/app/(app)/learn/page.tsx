import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserActivePlans, canAccessLearnMode, canAccessModule, canAccessContent } from '@/lib/utils/access'
import type { PlanType } from '@/lib/utils/types'

type ContentRow = {
  id: string
  position: number
  title: string
  description: string | null
  starter_pack_accessible: boolean
}

type WeekRow = {
  id: string
  content_id: string | null
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
  searchParams: Promise<{ content?: string; week?: string }>
}

export default async function LearnPage({ searchParams }: Props) {
  const { content: contentParam, week: weekParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const plans = await getUserActivePlans(user.id)
  if (!canAccessLearnMode(plans)) redirect('/dashboard')
  const plan = plans[0] ?? null

  // Charger les contenus publiés
  const contentsResult = await supabase
    .from('contents')
    .select('id, position, title, description, starter_pack_accessible')
    .eq('is_published', true)
    .order('position')

  const allContents = contentsResult.data as ContentRow[] | null ?? []
  // Filtrer les contenus selon le plan (starter_pack ne voit que les contenus accessibles)
  const contents = allContents.filter((c) => canAccessContent(plans, c.starter_pack_accessible))

  if (contents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Le curriculum sera bientôt disponible.</p>
      </div>
    )
  }

  const activeContent = contents.find((c) => c.id === contentParam) ?? contents[0]

  // Charger les semaines du contenu actif
  const weeksResult = await supabase
    .from('weeks')
    .select('id, content_id, position, title, description')
    .eq('content_id', activeContent.id)
    .eq('is_published', true)
    .order('position')

  const weeks = weeksResult.data as WeekRow[] | null ?? []
  const activeWeek = weeks.find((w) => w.id === weekParam) ?? weeks[0]

  // Charger les modules de la semaine active
  const modules = activeWeek ? await supabase
    .from('modules')
    .select('id, week_id, position, title, slug, description, required_plan, preview_url, figma_url, is_published')
    .eq('week_id', activeWeek.id)
    .eq('is_published', true)
    .order('position')
    .then((r) => r.data as ModuleRow[] | null ?? []) : []

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
        <div className="p-4 space-y-5">
          {/* Contenus */}
          {contents.map((content) => {
            const isActiveContent = content.id === activeContent.id
            const contentWeeks = weeks.filter((w) => w.content_id === content.id)

            return (
              <div key={content.id}>
                <Link
                  href={`/learn?content=${content.id}`}
                  className={`block px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActiveContent ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {content.title}
                </Link>

                {/* Semaines du contenu actif */}
                {isActiveContent && weeks.length > 0 && (
                  <div className="mt-1 ml-2 space-y-0.5">
                    {weeks.map((week) => {
                      const isActiveWeek = activeWeek?.id === week.id
                      return (
                        <Link
                          key={week.id}
                          href={`/learn?content=${activeContent.id}&week=${week.id}`}
                          className={`flex items-start gap-2 px-3 py-2 rounded-lg transition-colors ${
                            isActiveWeek
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                          }`}
                        >
                          <span className="text-xs font-mono text-gray-400 mt-0.5 flex-shrink-0">S{week.position}</span>
                          <span className="text-sm leading-snug">{week.title}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {activeWeek ? (
            <>
              <div className="mb-6">
                <p className="text-xs text-gray-400 mb-1">{activeContent.title}</p>
                <h1 className="text-xl font-semibold text-gray-900">
                  Bloc {activeWeek.position} — {activeWeek.title}
                </h1>
                {activeWeek.description && (
                  <p className="text-sm text-gray-500 mt-1">{activeWeek.description}</p>
                )}
              </div>

              {modules.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun module disponible pour ce bloc.</p>
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
                        <div className="aspect-video bg-gray-100 overflow-hidden relative">
                          {mod.preview_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mod.preview_url} alt={mod.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-gray-300">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5"/>
                              </svg>
                            </div>
                          )}
                          <span className="absolute top-2 left-2 text-xs font-semibold bg-black/60 text-white px-2 py-0.5 rounded-full">{idx + 1}</span>
                          {isLocked && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                              <span className="text-2xl">🔒</span>
                            </div>
                          )}
                          {mod.required_plan === 'pro' && (
                            <span className="absolute top-2 right-2 text-xs font-semibold bg-purple-600 text-white px-2 py-0.5 rounded-full">Pro</span>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{mod.title}</h3>
                          {mod.description && (
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{mod.description}</p>
                          )}
                        </div>
                        {!isLocked && <Link href={href} className="absolute inset-0" aria-label={mod.title} />}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">Aucun bloc disponible pour ce contenu.</p>
          )}
        </div>
      </div>
    </div>
  )
}
