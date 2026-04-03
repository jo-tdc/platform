import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  brief_text: z.string().optional(),
  brief_summary: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived', 'done', 'deleted']).optional(),
})

type Params = { params: Promise<{ id: string }> }

// GET /api/projects/[id]
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const result = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (result.error || !result.data) {
    return Response.json({ error: 'Projet introuvable' }, { status: 404 })
  }

  return Response.json({ project: result.data })
}

// PUT /api/projects/[id]
export async function PUT(request: Request, { params }: Params) {
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

  const parsed = UpdateProjectSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  // Vérifier que le projet appartient à l'utilisateur
  const existing = await supabase
    .from('projects')
    .select('id, brief_summary')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (existing.error || !existing.data) {
    return Response.json({ error: 'Projet introuvable' }, { status: 404 })
  }

  const updateResult = await supabase
    .from('projects')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (updateResult.error) {
    return Response.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }

  // Invalidation des prompts compilés si brief_summary a changé
  const existingRow = existing.data as { id: string; brief_summary: string | null }
  if (
    parsed.data.brief_summary !== undefined &&
    parsed.data.brief_summary !== existingRow.brief_summary
  ) {
    await supabase
      .from('project_agents')
      .update({ compiled_prompt: null, prompt_version: supabase.rpc as unknown as number })
      .eq('project_id', id)

    // On utilise une requête raw pour incrémenter prompt_version
    await supabase
      .from('project_agents')
      .update({ compiled_prompt: null })
      .eq('project_id', id)

    // Incrément de prompt_version via RPC ou en SQL direct
    // Pour l'instant on le fait en deux passes
    const agentsResult = await supabase
      .from('project_agents')
      .select('id, prompt_version')
      .eq('project_id', id)

    const agents = agentsResult.data as Array<{ id: string; prompt_version: number }> | null ?? []
    for (const agent of agents) {
      await supabase
        .from('project_agents')
        .update({ prompt_version: agent.prompt_version + 1 })
        .eq('id', agent.id)
    }
  }

  return Response.json({ project: updateResult.data })
}

// DELETE /api/projects/[id]
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const result = await supabase
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (result.error) {
    return Response.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }

  return Response.json({ success: true })
}
