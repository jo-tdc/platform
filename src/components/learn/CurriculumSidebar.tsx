import Link from 'next/link'
import ModuleProgress from '@/components/learn/ModuleProgress'
import type { Week, Module } from '@/lib/utils/types'

type ModuleWithProgress = Module & {
  completedLessons: number
  totalLessons: number
  isUnlocked: boolean
}

type WeekWithModules = Week & {
  modules: ModuleWithProgress[]
}

type Props = {
  weeks: WeekWithModules[]
  activeModuleSlug?: string
}

export default function CurriculumSidebar({ weeks, activeModuleSlug }: Props) {
  return (
    <nav className="w-64 flex-shrink-0 border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Curriculum
        </h2>

        <div className="space-y-6">
          {weeks.map((week) => (
            <div key={week.id}>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                Bloc {week.position} — {week.title}
              </p>
              <div className="space-y-1">
                {week.modules.map((mod) => {
                  const isActive = mod.slug === activeModuleSlug
                  const isLocked = !mod.isUnlocked

                  return (
                    <div key={mod.id}>
                      {isLocked ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg opacity-50 cursor-not-allowed">
                          <span className="text-gray-400">🔒</span>
                          <span className="text-sm text-gray-500 truncate">{mod.title}</span>
                        </div>
                      ) : (
                        <Link
                          href={`/learn/${week.id}/${mod.slug}`}
                          className={`flex flex-col gap-1 px-3 py-2 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-gray-900 text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <span className="text-sm font-medium truncate">{mod.title}</span>
                          {mod.totalLessons > 0 && (
                            <ModuleProgress
                              completed={mod.completedLessons}
                              total={mod.totalLessons}
                            />
                          )}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </nav>
  )
}
