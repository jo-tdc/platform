import ChatWindow from '@/components/chat/ChatWindow'

type Props = {
  projectId: string
  projectName: string
}

export default function PracticeChat({ projectId, projectName }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <p className="text-sm font-medium text-gray-900">Coach IA</p>
        <p className="text-xs text-gray-400 truncate">{projectName}</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          apiRoute="/api/practice/chat"
          contextPayload={{ projectId }}
          projectId={projectId}
          placeholder="Comment puis-je t'aider sur ce projet ?"
          welcomeMessage="Bonjour ! Je suis ton coach produit. Décris-moi où tu en es, et travaillons ensemble."
        />
      </div>
    </div>
  )
}
