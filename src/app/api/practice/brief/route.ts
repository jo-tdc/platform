import { createClient } from '@/lib/supabase/server'
import { buildBriefSummaryPrompt } from '@/lib/ai/prompts/brief-summary'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY manquante')
  return new Anthropic({ apiKey })
}

const RequestSchema = z.object({
  brief_text: z.string().min(10).max(10000),
})

// POST /api/practice/brief — génère un brief_summary à partir du brief_text
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

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

  const systemPrompt = buildBriefSummaryPrompt()

  // Brief generation — on attend la réponse complète (pas de streaming ici)
  try {
    const anthropic = getAnthropic()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: parsed.data.brief_text,
        },
      ],
    })

    const summary = response.content[0].type === 'text' ? response.content[0].text : ''

    return Response.json({ brief_summary: summary })
  } catch {
    return Response.json({ error: 'Erreur lors de la génération du brief' }, { status: 500 })
  }
}
