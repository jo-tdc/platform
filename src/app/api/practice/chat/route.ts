import { createClient } from '@/lib/supabase/server'
import { createStreamResponse } from '@/lib/ai/stream'
import { buildPracticeChatPrompt } from '@/lib/ai/prompts/practice-chat'
import { checkTrialRateLimit } from '@/lib/utils/rate-limit'
import type { ChatMessage } from '@/lib/utils/types'
import { z } from 'zod'

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1),
    })
  ).min(1),
  projectId: z.string().uuid(),
})

// POST /api/practice/chat — chat général du workspace projet avec streaming
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérification rate limit trial
  const rateLimit = await checkTrialRateLimit(user.id)
  if (!rateLimit.allowed) {
    return Response.json(
      { error: `Limite quotidienne atteinte (${rateLimit.limit} messages/jour). Passe en Pro pour continuer.` },
      { status: 429 }
    )
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

  // Récupérer le projet et vérifier l'accès
  const projectResult = await supabase
    .from('projects')
    .select('id, brief_summary')
    .eq('id', parsed.data.projectId)
    .eq('user_id', user.id)
    .single()

  if (projectResult.error || !projectResult.data) {
    return Response.json({ error: 'Projet introuvable' }, { status: 404 })
  }

  const project = projectResult.data as { id: string; brief_summary: string | null }
  const briefSummary = project.brief_summary ?? 'Projet sans brief défini.'

  const systemPrompt = buildPracticeChatPrompt(briefSummary)

  return createStreamResponse(parsed.data.messages as ChatMessage[], systemPrompt)
}
