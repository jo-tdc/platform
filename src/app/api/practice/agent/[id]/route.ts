import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createStreamResponse, createStreamResponseWithAttachments } from '@/lib/ai/stream'
import type { FileAttachment } from '@/lib/ai/stream'
import { compileAgentPrompt } from '@/lib/ai/compile-agent-prompt'
import { checkTrialRateLimit } from '@/lib/utils/rate-limit'
import type { AgentTemplate, ChatMessage } from '@/lib/utils/types'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const MessageSchema = z.array(
  z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
  })
).min(1)

const MAX_FILE_SIZE = 20 * 1024 * 1024

// POST /api/practice/agent/[id] — chat avec un agent spécialisé (streaming)
// Accepte JSON { messages } ou FormData { messages (JSON), files? }
export async function POST(request: Request, { params }: Params) {
  const { id: agentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const rateLimit = await checkTrialRateLimit(user.id)
  if (!rateLimit.allowed) {
    return Response.json(
      { error: `Limite quotidienne atteinte (${rateLimit.limit} messages/jour).` },
      { status: 429 }
    )
  }

  const contentType = request.headers.get('content-type') ?? ''
  let messages: ChatMessage[]
  let attachments: FileAttachment[] = []

  if (contentType.includes('multipart/form-data')) {
    let formData: FormData
    try { formData = await request.formData() } catch {
      return Response.json({ error: 'FormData invalide' }, { status: 400 })
    }
    const rawMessages = formData.get('messages')
    if (!rawMessages) return Response.json({ error: 'Messages manquants' }, { status: 422 })

    const parsed = MessageSchema.safeParse(JSON.parse(rawMessages as string))
    if (!parsed.success) return Response.json({ error: 'Messages invalides' }, { status: 422 })
    messages = parsed.data as ChatMessage[]

    const files = formData.getAll('files') as File[]
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) return Response.json({ error: `Fichier "${file.name}" trop volumineux (max 20 MB)` }, { status: 422 })
      const buffer = await file.arrayBuffer()
      attachments.push({ name: file.name, type: file.type, base64: Buffer.from(buffer).toString('base64') })
    }
  } else {
    let body: unknown
    try { body = await request.json() } catch {
      return Response.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }
    const parsed = z.object({ messages: MessageSchema }).safeParse(body)
    if (!parsed.success) return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
    messages = parsed.data.messages as ChatMessage[]
  }

  const service = createServiceClient()

  type AgentRow = {
    compiled_prompt: string | null
    context_values: Record<string, string> | null
    agent_templates: AgentTemplate
    projects: { user_id: string; brief_summary: string | null }
  }
  type AgentResult = { data: AgentRow | null; error: { message: string } | null }

  const agentResult = (await service
    .from('project_agents')
    .select('*, agent_templates(*), projects!inner(user_id, brief_summary)')
    .eq('id', agentId)
    .single()) as unknown as AgentResult

  if (agentResult.error || !agentResult.data) {
    return Response.json({ error: 'Agent introuvable' }, { status: 404 })
  }

  const agentRow = agentResult.data

  if (agentRow.projects.user_id !== user.id) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  let systemPrompt = agentRow.compiled_prompt

  if (!systemPrompt) {
    const briefSummary = agentRow.projects.brief_summary ?? 'Projet sans brief défini.'
    const contextValues = agentRow.context_values ?? {}
    systemPrompt = compileAgentPrompt(agentRow.agent_templates, contextValues, briefSummary)

    await service
      .from('project_agents')
      .update({ compiled_prompt: systemPrompt })
      .eq('id', agentId)
  }

  if (attachments.length > 0) {
    return createStreamResponseWithAttachments(messages, systemPrompt, attachments)
  }
  return createStreamResponse(messages, systemPrompt)
}
