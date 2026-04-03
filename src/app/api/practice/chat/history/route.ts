import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const QuerySchema = z.object({
  projectId: z.string().uuid(),
})

// GET /api/practice/chat/history?projectId={id}
// Finds or creates an ai_session for this user+project, returns all messages
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({ projectId: searchParams.get('projectId') })
  if (!parsed.success) {
    return Response.json({ error: 'projectId invalide' }, { status: 422 })
  }

  const { projectId } = parsed.data

  // Verify user owns this project
  const projectResult = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectResult.error || !projectResult.data) {
    return Response.json({ error: 'Projet introuvable' }, { status: 404 })
  }

  // Find existing session for this user+project
  const sessionResult = await supabase
    .from('ai_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .eq('agent_type', 'practice_chat')
    .order('started_at', { ascending: false })
    .limit(1)

  let sessionId: string

  if (sessionResult.data && sessionResult.data.length > 0) {
    sessionId = sessionResult.data[0].id
  } else {
    // Create a new session
    const newSession = await supabase
      .from('ai_sessions')
      .insert({
        user_id: user.id,
        project_id: projectId,
        agent_type: 'practice_chat',
      })
      .select('id')
      .single()

    if (newSession.error || !newSession.data) {
      return Response.json({ error: 'Impossible de créer la session' }, { status: 500 })
    }

    sessionId = newSession.data.id
  }

  // Load messages for this session
  const messagesResult = await supabase
    .from('ai_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (messagesResult.error) {
    return Response.json({ error: 'Impossible de charger les messages' }, { status: 500 })
  }

  return Response.json({
    sessionId,
    messages: messagesResult.data ?? [],
  })
}
