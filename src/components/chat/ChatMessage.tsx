import ReactMarkdown from 'react-markdown'

type Props = {
  role: 'user' | 'assistant'
  content: string
  agentIcon?: string
  agentLabel?: string
}

export default function ChatMessage({ role, content, agentIcon, agentLabel }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
            isUser
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}
        >
          {isUser ? 'T' : (agentIcon ?? 'AI')}
        </div>
        {!isUser && agentLabel && (
          <span className="text-[10px] text-gray-400 leading-none whitespace-nowrap max-w-[56px] text-center truncate">
            {agentLabel}
          </span>
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-gray-900 text-white rounded-tr-sm'
            : 'bg-gray-100 text-gray-800 rounded-tl-sm'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              h1: ({ children }) => <h1 className="font-semibold text-base mb-1">{children}</h1>,
              h2: ({ children }) => <h2 className="font-semibold mb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="font-medium mb-1">{children}</h3>,
              code: ({ children }) => (
                <code className="bg-gray-200 text-gray-800 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="bg-gray-200 rounded-lg p-3 text-xs font-mono overflow-x-auto mb-2">{children}</pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-gray-400 pl-3 italic text-gray-600 mb-2">{children}</blockquote>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
