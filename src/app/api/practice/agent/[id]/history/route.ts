import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const QuerySchema = z.object({
  projectId: z.string().uuid(),
})

type Params = { params: Promise<{ id: string }> }

// GET /api/practice/agent/[id]/history?projectId={id}
// Finds or creates an ai_session for this user+agent+project, returns all messages
export async function GET(request: Request, { params }: Params) {
  const { id: agentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({ projectId: searchParams.get('projectId') })
  if (!parsed.success) {
    return Response.json({ error: 'projectId invalide' }, { status: 422 })
  }

  const { projectId } = parsed.data
  const service = createServiceClient()

  // Verify agent belongs to a project owned by this user
  type AgentCheck = { data: { id: string; projects: { user_id: string } } | null; error: { message: string } | null }
  const agentResult = (await service
    .from('project_agents')
    .select('id, projects!inner(user_id)')
    .eq('id', agentId)
    .single()) as unknown as AgentCheck

  if (agentResult.error || !agentResult.data) {
    return Response.json({ error: 'Agent introuvable' }, { status: 404 })
  }

  if (agentResult.data.projects.user_id !== user.id) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // Find existing session for this user+agent+project
  const sessionResult = await service
    .from('ai_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .eq('project_agent_id', agentId)
    .eq('agent_type', 'practice_agent')
    .order('started_at', { ascending: false })
    .limit(1)

  let sessionId: string

  if (sessionResult.data && sessionResult.data.length > 0) {
    sessionId = sessionResult.data[0].id
  } else {
    const newSession = await service
      .from('ai_sessions')
      .insert({
        user_id: user.id,
        project_id: projectId,
        project_agent_id: agentId,
        agent_type: 'practice_agent',
      })
      .select('id')
      .single()

    if (newSession.error || !newSession.data) {
      return Response.json({ error: 'Impossible de créer la session' }, { status: 500 })
    }

    sessionId = newSession.data.id
  }

  // Load messages for this session
  const messagesResult = await service
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
