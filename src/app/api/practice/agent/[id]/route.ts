import { createClient } from '@/lib/supabase/server'
import { createStreamResponse } from '@/lib/ai/stream'
import { compileAgentPrompt } from '@/lib/ai/compile-agent-prompt'
import { checkTrialRateLimit } from '@/lib/utils/rate-limit'
import type { AgentTemplate, ChatMessage } from '@/lib/utils/types'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1),
    })
  ).min(1),
})

// POST /api/practice/agent/[id] — chat avec un agent spécialisé (streaming)
// [id] = project_agent_id
export async function POST(request: Request, { params }: Params) {
  const { id: agentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérification rate limit trial
  const rateLimit = await checkTrialRateLimit(user.id)
  if (!rateLimit.allowed) {
    return Response.json(
      { error: `Limite quotidienne atteinte (${rateLimit.limit} messages/jour).` },
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

  // Récupérer l'agent + template + brief projet + vérifier accès
  type AgentRow = {
    compiled_prompt: string | null
    context_values: Record<string, string> | null
    agent_templates: AgentTemplate
    projects: { user_id: string; brief_summary: string | null }
  }
  type AgentResult = { data: AgentRow | null; error: { message: string } | null }

  const agentResult = (await supabase
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

  // Utiliser le prompt compilé ou le recompiler à la volée si nécessaire
  let systemPrompt = agentRow.compiled_prompt

  if (!systemPrompt) {
    const briefSummary = agentRow.projects.brief_summary ?? 'Projet sans brief défini.'
    const contextValues = agentRow.context_values ?? {}
    systemPrompt = compileAgentPrompt(agentRow.agent_templates, contextValues, briefSummary)

    // Sauvegarder le prompt compilé pour les prochains appels
    await supabase
      .from('project_agents')
      .update({ compiled_prompt: systemPrompt })
      .eq('id', agentId)
  }

  return createStreamResponse(parsed.data.messages as ChatMessage[], systemPrompt)
}
