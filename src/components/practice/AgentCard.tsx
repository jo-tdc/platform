type Agent = {
  id: string
  custom_name: string | null
  agent_templates: {
    name: string
    description: string
    icon: string | null
  }
}

type Props = {
  agent: Agent
  isActive: boolean
  onSelect: (agentId: string) => void
}

export default function AgentCard({ agent, isActive, onSelect }: Props) {
  const name = agent.custom_name ?? agent.agent_templates.name
  const icon = agent.agent_templates.icon ?? '🤖'

  return (
    <button
      onClick={() => onSelect(agent.id)}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isActive
          ? 'border-gray-900 bg-gray-900 text-white'
          : 'border-gray-200 bg-white hover:border-gray-400'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-900'}`}>
            {name}
          </p>
          <p className={`text-xs mt-0.5 line-clamp-2 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
            {agent.agent_templates.description}
          </p>
        </div>
      </div>
    </button>
  )
}
