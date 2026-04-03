import Link from 'next/link'
import type { Project } from '@/lib/utils/types'

type Props = {
  projects: Project[]
}

export default function ProjectList({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-sm mb-4">Aucun projet pour l'instant.</p>
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
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/practice/${project.id}`}
          className="group flex flex-col justify-end h-48 p-5 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors bg-white"
        >
          <div className="flex items-end justify-between gap-3">
            <h3 className="font-medium text-gray-900 group-hover:text-gray-700 leading-snug line-clamp-2">
              {project.name}
            </h3>
            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 mb-0.5">
              active
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
