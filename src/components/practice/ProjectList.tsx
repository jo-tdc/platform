import Link from 'next/link'
import type { Project } from '@/lib/utils/types'

type Props = {
  projects: Project[]
}

function formatLastActivity(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffH < 24) return `il y a ${diffH}h`
  if (diffDays === 1) return 'hier'
  if (diffDays < 7) {
    const days = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
    return days[date.getDay()]
  }
  const months = ['jan.', 'fév.', 'mar.', 'avr.', 'mai', 'jun.', 'jul.', 'aoû.', 'sep.', 'oct.', 'nov.', 'déc.']
  const day = date.getDate()
  const month = months[date.getMonth()]
  if (date.getFullYear() === now.getFullYear()) return `${day} ${month}`
  return `${day} ${month} ${date.getFullYear()}`
}

const STATUS_BADGE: Record<string, { pill: string; dot: string }> = {
  active:   { pill: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-400' },
  done:     { pill: 'bg-green-50 text-green-700',   dot: 'bg-green-500' },
  deleted:  { pill: 'bg-red-50 text-red-700',       dot: 'bg-red-500' },
  draft:    { pill: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
  archived: { pill: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  done: 'Done',
  deleted: 'Deleted',
  draft: 'Draft',
  archived: 'Archived',
}

export default function ProjectList({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-sm mb-4">Aucun projet pour l&apos;instant.</p>
        <Link
          href="/practice/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Créer mon premier projet
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => {
        const status = (project.status as string) ?? 'active'
        const badge = STATUS_BADGE[status] ?? STATUS_BADGE.active
        const badgeLabel = STATUS_LABEL[status] ?? status
        const lastActivity = formatLastActivity(project.updated_at as string | null)

        return (
          <Link
            key={project.id}
            href={`/practice/${project.id}`}
            className="group flex flex-col justify-end h-48 p-5 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors bg-white"
          >
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium text-gray-900 group-hover:text-gray-700 leading-snug line-clamp-2">
                  {project.name}
                </h3>
                {lastActivity && (
                  <p className="text-xs text-gray-400 mt-1">{lastActivity}</p>
                )}
              </div>
              <span className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium mb-0.5 ${badge.pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                {badgeLabel}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
