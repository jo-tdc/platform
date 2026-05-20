'use client'

import { useState, useRef, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'

const CopyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M10 5V3.5A1.5 1.5 0 0 0 8.5 2h-5A1.5 1.5 0 0 0 2 3.5v5A1.5 1.5 0 0 0 3.5 10H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M2 7.5L5.5 11L13 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

function CopyableBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLPreElement>(null)

  function handleCopy() {
    const text = ref.current?.textContent ?? ''
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative mb-3 group">
      <pre ref={ref} className="bg-gray-50 border border-gray-200 rounded-lg p-3 pb-8 text-xs font-mono overflow-x-auto text-gray-900">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        title={copied ? 'Copié !' : 'Copier'}
        className="absolute bottom-2 right-2 flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  )
}

type Props = {
  role: 'user' | 'assistant'
  content: string
  agentIcon?: string
  agentLabel?: string
}

export default function ChatMessage({ role, content, agentIcon, agentLabel }: Props) {
  const [copied, setCopied] = useState(false)
  const isUser = role === 'user'

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-gray-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 items-start">
      {/* Avatar agent */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
        <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-500">
          {agentIcon ?? '🤖'}
        </div>
        {agentLabel && (
          <span className="text-[9px] text-gray-400 leading-none whitespace-nowrap max-w-[52px] text-center truncate">
            {agentLabel}
          </span>
        )}
      </div>

      {/* Texte plat, pleine largeur */}
      <div className="flex-1 min-w-0 text-sm text-gray-900 leading-relaxed prose-custom">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            h1: ({ children }) => <h1 className="text-base font-semibold text-gray-900 mb-2 mt-4 first:mt-0">{children}</h1>,
            h2: ({ children }) => <h2 className="text-sm font-semibold text-gray-900 mb-2 mt-4 first:mt-0">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-medium text-gray-900 mb-1.5 mt-3 first:mt-0">{children}</h3>,
            hr: () => <hr className="my-4 border-gray-200" />,
            code: ({ children }) => (
              <code className="bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 text-xs font-mono border border-gray-200">{children}</code>
            ),
            pre: ({ children }) => <CopyableBlock>{children}</CopyableBlock>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-gray-300 pl-4 text-gray-600 mb-3 italic">{children}</blockquote>
            ),
          }}
        >
          {content}
        </ReactMarkdown>

        {/* Bouton copier le message entier */}
        <button
          onClick={handleCopy}
          title={copied ? 'Copié !' : 'Copier'}
          className="mt-2 flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
    </div>
  )
}
