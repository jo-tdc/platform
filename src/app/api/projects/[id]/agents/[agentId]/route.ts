import { createClient } from '@/lib/supabase/server'
import { compileAgentPrompt } from '@/lib/ai/compile-agent-prompt'
import type { AgentTemplate } from '@/lib/utils/types'
import { z } from 'zod'

type Params = { params: Promise<{ id: string; agentId: string }> }

const UpdateAgentSchema = z.object({
  custom_name: z.string().max(100).optional(),
  context_values: z.record(z.string(), z.string()).optional(),
})

// GET /api/projects/[id]/agents/[agentId]
export async function GET(_request: Request, { params }: Params) {
  const { id, agentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  type GetAgentRow = { id: string; projects: { user_id: string } }
  type GetResult = { data: GetAgentRow | null; error: { message: string } | null }
  const result = (await supabase
    .from('project_agents')
    .select('*, agent_templates(*), projects!inner(user_id)')
    .eq('id', agentId)
    .eq('project_id', id)
    .single()) as unknown as GetResult

  if (result.error || !result.data) {
    return Response.json({ error: 'Agent introuvable' }, { status: 404 })
  }

  if (result.data.projects.user_id !== user.id) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  return Response.json({ agent: result.data })
}

// PUT /api/projects/[id]/agents/[agentId] — mettre à jour context_values et recompiler
export async function PUT(request: Request, { params }: Params) {
  const { id, agentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = UpdateAgentSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  // Récupérer l'agent + template + projet en une requête
  type PutAgentRow = {
    context_values: Record<string, string> | null
    prompt_version: number
    agent_templates: AgentTemplate
    projects: { user_id: string; brief_summary: string | null }
  }
  type PutResult = { data: PutAgentRow | null; error: { message: string } | null }
  const agentResult = (await supabase
    .from('project_agents')
    .select('*, agent_templates(*), projects!inner(user_id, brief_summary)')
    .eq('id', agentId)
    .eq('project_id', id)
    .single()) as unknown as PutResult

  if (agentResult.error || !agentResult.data) {
    return Response.json({ error: 'Agent introuvable' }, { status: 404 })
  }

  const agentRow = agentResult.data

  if (agentRow.projects.user_id !== user.id) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const newContextValues = (parsed.data.context_values ?? agentRow.context_values ?? {}) as Record<string, string>
  const template = agentRow.agent_templates
  const briefSummary = agentRow.projects.brief_summary

  const compiledPrompt = briefSummary
    ? compileAgentPrompt(template, newContextValues, briefSummary)
    : null

  const updateResult = await supabase
    .from('project_agents')
    .update({
      custom_name: parsed.data.custom_name ?? undefined,
      context_values: newContextValues,
      compiled_prompt: compiledPrompt,
      prompt_version: agentRow.prompt_version + 1,
    })
    .eq('id', agentId)
    .select()
    .single()

  if (updateResult.error) {
    return Response.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }

  return Response.json({ agent: updateResult.data })
}

// DELETE /api/projects/[id]/agents/[agentId]
export async function DELETE(_request: Request, { params }: Params) {
  const { id, agentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérifier accès via le projet
  type DeleteCheck = { data: { projects: { user_id: string } } | null; error: { message: string } | null }
  const check = (await supabase
    .from('project_agents')
    .select('id, projects!inner(user_id)')
    .eq('id', agentId)
    .eq('project_id', id)
    .single()) as unknown as DeleteCheck

  if (check.error || !check.data) return Response.json({ error: 'Agent introuvable' }, { status: 404 })

  const checkData = check.data
  if (checkData.projects.user_id !== user.id) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  await supabase.from('project_agents').delete().eq('id', agentId)

  return Response.json({ success: true })
}
