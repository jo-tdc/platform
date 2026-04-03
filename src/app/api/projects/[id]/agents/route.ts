import { createClient } from '@/lib/supabase/server'
import { compileAgentPrompt } from '@/lib/ai/compile-agent-prompt'
import type { AgentTemplate } from '@/lib/utils/types'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const AddAgentSchema = z.object({
  template_id: z.string().uuid(),
  custom_name: z.string().max(100).optional(),
  context_values: z.record(z.string(), z.string()).optional(),
})

// GET /api/projects/[id]/agents
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérifier l'accès au projet
  const projectCheck = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (projectCheck.error) return Response.json({ error: 'Projet introuvable' }, { status: 404 })

  const result = await supabase
    .from('project_agents')
    .select('*, agent_templates(*)')
    .eq('project_id', id)
    .order('created_at')

  return Response.json({ agents: result.data ?? [] })
}

// POST /api/projects/[id]/agents — ajouter un agent à un projet
export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = AddAgentSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  // Vérifier accès projet + récupérer brief_summary
  const projectResult = await supabase
    .from('projects')
    .select('id, brief_summary')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (projectResult.error || !projectResult.data) {
    return Response.json({ error: 'Projet introuvable' }, { status: 404 })
  }

  const project = projectResult.data as { id: string; brief_summary: string | null }

  // Récupérer le template
  const templateResult = await supabase
    .from('agent_templates')
    .select('*')
    .eq('id', parsed.data.template_id)
    .eq('is_published', true)
    .single()

  if (templateResult.error || !templateResult.data) {
    return Response.json({ error: 'Template introuvable' }, { status: 404 })
  }

  const template = templateResult.data as AgentTemplate
  const contextValues = parsed.data.context_values ?? {}

  // Compiler le prompt si on a un brief
  const compiledPrompt = project.brief_summary
    ? compileAgentPrompt(template, contextValues, project.brief_summary)
    : null

  const insertResult = await supabase
    .from('project_agents')
    .insert({
      project_id: id,
      template_id: parsed.data.template_id,
      custom_name: parsed.data.custom_name ?? null,
      context_values: contextValues,
      compiled_prompt: compiledPrompt,
    })
    .select()
    .single()

  if (insertResult.error) {
    return Response.json({ error: 'Erreur lors de la création de l\'agent' }, { status: 500 })
  }

  return Response.json({ agent: insertResult.data }, { status: 201 })
}
