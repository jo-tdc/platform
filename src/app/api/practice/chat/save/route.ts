import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SaveSchema = z.object({
  sessionId: z.string().uuid(),
  userMessage: z.string().min(1),
  assistantMessage: z.string().min(1),
})

// POST /api/practice/chat/save — saves a user+assistant message pair
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

  const parsed = SaveSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides' }, { status: 422 })
  }

  const { sessionId, userMessage, assistantMessage } = parsed.data
  const service = createServiceClient()

  // Verify the session belongs to this user
  const sessionCheck = await service
    .from('ai_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (sessionCheck.error || !sessionCheck.data) {
    return Response.json({ error: 'Session introuvable' }, { status: 404 })
  }

  // Insert both messages
  const insertResult = await service
    .from('ai_messages')
    .insert([
      { session_id: sessionId, role: 'user', content: userMessage },
      { session_id: sessionId, role: 'assistant', content: assistantMessage },
    ])

  if (insertResult.error) {
    return Response.json({ error: 'Impossible de sauvegarder les messages' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
