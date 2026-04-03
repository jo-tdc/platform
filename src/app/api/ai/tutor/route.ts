import { createClient } from '@/lib/supabase/server'
import { createStreamResponse } from '@/lib/ai/stream'
import { buildTutorPrompt } from '@/lib/ai/prompts/tutor'
import type { ChatMessage } from '@/lib/utils/types'
import { z } from 'zod'

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1),
    })
  ).min(1),
  moduleId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  // Vérification session (le middleware a déjà vérifié le plan)
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

  const { messages, moduleId } = parsed.data

  // Récupérer le contexte du module si fourni
  let moduleContext: string | undefined
  if (moduleId) {
    const { data: moduleData } = await supabase
      .from('modules')
      .select('title, description, ai_context')
      .eq('id', moduleId)
      .eq('is_published', true)
      .limit(1)

    type ModuleRow = { title: string; description: string | null; ai_context: string | null }
    const mod = (moduleData as ModuleRow[] | null)?.[0]
    if (mod) {
      moduleContext = [
        `Module : ${mod.title}`,
        mod.description ? `Description : ${mod.description}` : null,
        mod.ai_context ? `Contexte pédagogique : ${mod.ai_context}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    }
  }

  const systemPrompt = buildTutorPrompt(moduleContext)

  return createStreamResponse(messages as ChatMessage[], systemPrompt)
}
