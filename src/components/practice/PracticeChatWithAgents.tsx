'use client'

import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import ChatMessage from '@/components/chat/ChatMessage'
import type { ChatMessage as ChatMessageType } from '@/lib/utils/types'

type PendingFile = {
  file: File
  previewUrl?: string // pour les images
}

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

type SelectedAgent =
  | { type: 'coach' }
  | { type: 'agent'; agent: Agent }

type Props = {
  projectId: string
  agents: Agent[]
}

const ICON_MAP: Record<string, string> = {
  target: '🎯',
  search: '🔍',
  lightbulb: '💡',
  'pen-tool': '✏️',
}

function resolveIcon(icon: string | null): string {
  if (!icon) return '🤖'
  return ICON_MAP[icon] ?? icon
}

function getAgentLabel(selected: SelectedAgent): string {
  if (selected.type === 'coach') return 'Product Design Mentor'
  return selected.agent.custom_name ?? selected.agent.agent_templates.name
}

function getApiRoute(selected: SelectedAgent): string {
  if (selected.type === 'coach') return '/api/practice/chat'
  return `/api/practice/agent/${selected.agent.id}`
}

function getContextPayload(selected: SelectedAgent, projectId: string): Record<string, string> {
  if (selected.type === 'coach') return { projectId }
  return {}
}

export default function PracticeChatWithAgents({ projectId, agents }: Props) {
  const [selected, setSelected] = useState<SelectedAgent>({ type: 'coach' })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [streaming, setStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Charger l'historique une seule fois au montage (session partagée du projet)
  useEffect(() => {
    fetch(`/api/practice/chat/history?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error('[PracticeChatWithAgents] history error:', data.error)
          return
        }
        if (data.sessionId) {
          setSessionId(data.sessionId)
          if (data.messages && data.messages.length > 0) {
            setMessages(
              data.messages.map((m: { role: 'user' | 'assistant'; content: string }) => ({
                role: m.role,
                content: m.content,
              }))
            )
          }
        }
      })
      .catch((err) => console.error('[PracticeChatWithAgents] history fetch failed:', err))
      .finally(() => setLoadingHistory(false))
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleInput() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const value = textareaRef.current?.value.trim()
    if ((!value && pendingFiles.length === 0) || streaming) return
    const content = value ?? ''
    if (textareaRef.current) {
      textareaRef.current.value = ''
      textareaRef.current.style.height = 'auto'
    }
    const filesToSend = pendingFiles.map((p) => p.file)
    setPendingFiles([])
    handleSend(content, filesToSend)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const newPending: PendingFile[] = files.map((file) => {
      const isImage = file.type.startsWith('image/')
      return {
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      }
    })
    setPendingFiles((prev) => [...prev, ...newPending])
    // Reset l'input pour permettre de sélectionner le même fichier à nouveau
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => {
      const next = [...prev]
      const removed = next.splice(index, 1)[0]
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return next
    })
  }

  function selectAgent(next: SelectedAgent) {
    setSelected(next)
    setDropdownOpen(false)
    textareaRef.current?.focus()
  }

  async function handleSend(content: string, files: File[] = []) {
    const displayContent = files.length > 0 && !content
      ? files.map((f) => `📎 ${f.name}`).join('\n')
      : content + (files.length > 0 ? '\n' + files.map((f) => `📎 ${f.name}`).join('\n') : '')

    const userMessage: ChatMessageType = { role: 'user', content: displayContent }
    const apiMessages: ChatMessageType[] = [...messages, { role: 'user', content: content || '(voir pièce jointe)' }]
    setMessages([...messages, userMessage])
    setStreaming(true)
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    let finalAssistantContent = ''

    let body: BodyInit
    const headers: Record<string, string> = {}

    if (files.length > 0) {
      const formData = new FormData()
      formData.append('messages', JSON.stringify(apiMessages))
      const payload = getContextPayload(selected, projectId)
      Object.entries(payload).forEach(([k, v]) => formData.append(k, v))
      files.forEach((f) => formData.append('files', f))
      body = formData
    } else {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify({
        messages: apiMessages,
        ...getContextPayload(selected, projectId),
      })
    }

    try {
      const response = await fetch(getApiRoute(selected), {
        method: 'POST',
        headers,
        body,
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

    if (sessionId && finalAssistantContent) {
      fetch('/api/practice/chat/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userMessage: content,
          assistantMessage: finalAssistantContent,
        }),
      }).catch(() => {/* ignore */})
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
    <div className="flex flex-col h-full w-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            Bonjour ! Je suis ton coach produit & design. Décris-moi où tu en es, et travaillons ensemble.
          </p>
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
      </div>

      {/* Zone de saisie avec sélecteur d'agent intégré */}
      <div className="flex-shrink-0 pb-4">
        <div className="max-w-3xl mx-auto px-4">
        {/* Input caché pour la sélection de fichiers */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.md"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="border border-gray-200 rounded-2xl bg-white focus-within:border-gray-400 transition-colors px-4 pt-3 pb-2">
          {/* Prévisualisation des fichiers joints */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingFiles.map((pf, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-gray-100 rounded-lg text-xs text-gray-700 max-w-[180px]"
                >
                  {pf.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pf.previewUrl} alt={pf.file.name} className="w-5 h-5 rounded object-cover flex-shrink-0" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-gray-500">
                      <path d="M8 1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5L8 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                      <path d="M8 1v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  <span className="truncate">{pf.file.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                    aria-label="Retirer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Répondre..."
            disabled={streaming}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            className="w-full resize-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent leading-relaxed min-h-[24px] max-h-40 disabled:opacity-50"
          />

          {/* Barre inférieure : bouton + / sélecteur d'agent / bouton envoyer */}
          <div className="flex items-center gap-2 mt-2">
            {/* Bouton + */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
              aria-label="Joindre un fichier"
              className="w-7 h-7 rounded-lg border border-gray-200 text-gray-400 flex items-center justify-center hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="flex-1" />
            {/* Sélecteur d'agent */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                <span>{getAgentLabel(selected)}</span>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 13 13"
                  fill="none"
                  className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M2.5 4.5L6.5 8.5L10.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Dropdown — s'ouvre vers le haut */}
              {dropdownOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1.5 overflow-hidden">
                  {/* Coach — par défaut */}
                  <button
                    onClick={() => selectAgent({ type: 'coach' })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left ${
                      selected.type === 'coach' ? 'bg-gray-50' : ''
                    }`}
                  >
                    <span className="text-lg leading-none flex-shrink-0">🎯</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">Product Design Mentor</p>
                      <p className="text-xs text-gray-400 truncate">Coach produit & design généraliste</p>
                    </div>
                    {selected.type === 'coach' && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto flex-shrink-0 text-gray-900">
                        <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  {agents.length > 0 && (
                    <>
                      <div className="mx-3 my-1 border-t border-gray-100" />
                      <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Agents du projet
                      </p>
                      {agents.map((agent) => {
                        const isActive = selected.type === 'agent' && selected.agent.id === agent.id
                        const label = agent.custom_name ?? agent.agent_templates.name
                        const icon = resolveIcon(agent.agent_templates.icon)
                        return (
                          <button
                            key={agent.id}
                            onClick={() => selectAgent({ type: 'agent', agent })}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left ${
                              isActive ? 'bg-gray-50' : ''
                            }`}
                          >
                            <span className="text-lg leading-none flex-shrink-0">{icon}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
                              <p className="text-xs text-gray-400 truncate">{agent.agent_templates.description}</p>
                            </div>
                            {isActive && (
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto flex-shrink-0 text-gray-900">
                                <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Bouton envoyer */}
            <button
              onClick={submit}
              disabled={streaming}
              aria-label="Envoyer"
              className="w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 7L7 13M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
