'use client'

import { useState, useRef, useEffect } from 'react'
import ChatMessage from '@/components/chat/ChatMessage'
import ChatInput from '@/components/chat/ChatInput'
import type { ChatMessage as ChatMessageType } from '@/lib/utils/types'

type Props = {
  apiRoute: string
  contextPayload?: Record<string, string>
  placeholder?: string
  welcomeMessage?: string
  // When provided, chat history is persisted and restored on mount
  projectId?: string
}

export default function ChatWindow({
  apiRoute,
  contextPayload,
  placeholder,
  welcomeMessage,
  projectId,
}: Props) {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [streaming, setStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(!!projectId)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load history on mount when projectId is provided
  useEffect(() => {
    if (!projectId) return

    fetch(`/api/practice/chat/history?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error('[ChatWindow] history error:', data.error)
          return
        }
        if (data.sessionId) {
          setSessionId(data.sessionId)
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages.map((m: { role: 'user' | 'assistant'; content: string }) => ({
              role: m.role,
              content: m.content,
            })))
          }
        }
      })
      .catch((err) => console.error('[ChatWindow] history fetch failed:', err))
      .finally(() => setLoadingHistory(false))
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(content: string) {
    const userMessage: ChatMessageType = { role: 'user', content }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setStreaming(true)

    // Add empty assistant message that will fill via streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    let finalAssistantContent = ''

    try {
      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          ...contextPayload,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: `Erreur : ${err.error ?? 'Erreur inconnue'}` },
        ])
        return
      }

      const reader = response.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })

        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: accumulated },
        ])
      }

      finalAssistantContent = accumulated
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Une erreur réseau est survenue. Réessaie.' },
      ])
    } finally {
      setStreaming(false)
    }

    // Persist to DB if we have a session
    if (sessionId && finalAssistantContent) {
      fetch('/api/practice/chat/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userMessage: content,
          assistantMessage: finalAssistantContent,
        }),
      }).catch(() => {/* ignore save errors */})
    }
  }

  if (loadingHistory) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-gray-400">Chargement de l'historique…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && welcomeMessage && (
          <p className="text-sm text-gray-400 text-center py-8">{welcomeMessage}</p>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {streaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-600">
              AI
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4">
        <ChatInput
          onSend={handleSend}
          disabled={streaming}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}
