'use client'

import PracticeChatWithAgents from '@/components/practice/PracticeChatWithAgents'

type Agent = {
  id: string
  custom_name: string | null
  context_values: Record<string, string> | null
  agent_templates: {
    name: string
    description: string
    icon: string | null
    context_variables: unknown
  }
}

type Props = {
  projectId: string
  projectName: string
  agents: Agent[]
}

export default function ProjectWorkspace({ projectId, agents }: Props) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <PracticeChatWithAgents projectId={projectId} agents={agents} />
    </div>
  )
}
