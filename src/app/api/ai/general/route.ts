import { createClient } from '@/lib/supabase/server'
import { createStreamResponse } from '@/lib/ai/stream'
import { buildGeneralPrompt } from '@/lib/ai/prompts/general'
import type { ChatMessage } from '@/lib/utils/types'
import { z } from 'zod'

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1),
    })
  ).min(1),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  const systemPrompt = buildGeneralPrompt()

  return createStreamResponse(parsed.data.messages as ChatMessage[], systemPrompt)
}
