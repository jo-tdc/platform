import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ProjectWorkspace from '@/components/practice/ProjectWorkspace'
import ProjectStatusSelector from '@/components/practice/ProjectStatusSelector'

type Props = {
  params: Promise<{ projectId: string }>
}

type AgentWithTemplate = {
  id: string
  custom_name: string | null
  context_values: Record<string, string> | null
  agent_templates: {
    name: string
    description: string
    icon: string | null
    context_variables: Record<string, string> | null
  }
}

export default async function ProjectPage({ params }: Props) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const projectResult = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectResult.error || !projectResult.data) notFound()

  const project = projectResult.data as {
    id: string
    name: string
    brief_summary: string | null
    status: string
  }

  const agentsResult = await supabase
    .from('project_agents')
    .select('id, custom_name, context_values, agent_templates(name, description, icon, context_variables)')
    .eq('project_id', projectId)
    .order('created_at')

  const agents = agentsResult.data as AgentWithTemplate[] | null ?? []

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Barre de projet */}
      <div className="h-11 border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
        <Link
          href="/practice"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        >
          ← Projets
        </Link>
        <span className="text-gray-200">|</span>
        <h1 className="text-sm font-medium text-gray-900 truncate">{project.name}</h1>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href={`/practice/${projectId}/brief`}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            Brief
          </Link>
          <Link
            href={`/practice/${projectId}/agents`}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            Agents
          </Link>
          <ProjectStatusSelector projectId={project.id} initialStatus={project.status} />
        </div>
      </div>

      <ProjectWorkspace
        projectId={project.id}
        projectName={project.name}
        agents={agents}
      />
    </div>
  )
}
