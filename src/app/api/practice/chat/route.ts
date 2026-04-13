import { createClient } from '@/lib/supabase/server'
import { createStreamResponse, createStreamResponseWithAttachments } from '@/lib/ai/stream'
import type { FileAttachment } from '@/lib/ai/stream'
import { buildPracticeChatPrompt } from '@/lib/ai/prompts/practice-chat'
import { checkTrialRateLimit } from '@/lib/utils/rate-limit'
import type { ChatMessage } from '@/lib/utils/types'
import { z } from 'zod'

const MessageSchema = z.array(
  z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
  })
).min(1)

const MAX_FILE_SIZE = 20 * 1024 * 1024

// POST /api/practice/chat — chat général du workspace projet avec streaming
// Accepte JSON { messages, projectId } ou FormData { messages (JSON), projectId, files? }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const rateLimit = await checkTrialRateLimit(user.id)
  if (!rateLimit.allowed) {
    return Response.json(
      { error: `Limite quotidienne atteinte (${rateLimit.limit} messages/jour). Passe en Pro pour continuer.` },
      { status: 429 }
    )
  }

  const contentType = request.headers.get('content-type') ?? ''
  let messages: ChatMessage[]
  let projectId: string
  let attachments: FileAttachment[] = []

  if (contentType.includes('multipart/form-data')) {
    let formData: FormData
    try { formData = await request.formData() } catch {
      return Response.json({ error: 'FormData invalide' }, { status: 400 })
    }
    const rawMessages = formData.get('messages')
    projectId = (formData.get('projectId') as string | null) ?? ''
    if (!rawMessages || !projectId) return Response.json({ error: 'Données manquantes' }, { status: 422 })

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
    const schema = z.object({ messages: MessageSchema, projectId: z.string().uuid() })
    const parsed = schema.safeParse(body)
    if (!parsed.success) return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
    messages = parsed.data.messages as ChatMessage[]
    projectId = parsed.data.projectId
  }

  const projectResult = await supabase
    .from('projects')
    .select('id, brief_summary')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectResult.error || !projectResult.data) {
    return Response.json({ error: 'Projet introuvable' }, { status: 404 })
  }

  const briefSummary = (projectResult.data as { id: string; brief_summary: string | null }).brief_summary ?? 'Projet sans brief défini.'
  const systemPrompt = buildPracticeChatPrompt(briefSummary)

  if (attachments.length > 0) {
    return createStreamResponseWithAttachments(messages, systemPrompt, attachments)
  }
  return createStreamResponse(messages, systemPrompt)
}
