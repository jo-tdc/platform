import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  brief_text: z.string().optional(),
  brief_summary: z.string().optional(),
})

// GET /api/projects — liste des projets de l'utilisateur
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const result = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  if (result.error) {
    return Response.json({ error: 'Erreur lors de la récupération des projets' }, { status: 500 })
  }

  return Response.json({ projects: result.data })
}

// POST /api/projects — créer un nouveau projet
// Ajoute automatiquement tous les agent_templates publiés au projet créé.
export async function POST(request: Request) {
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

  const parsed = CreateProjectSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  const result = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      brief_text: parsed.data.brief_text ?? null,
      brief_summary: parsed.data.brief_summary ?? null,
      status: 'active',
    })
    .select()
    .single()

  if (result.error) {
    return Response.json({ error: result.error.message }, { status: 500 })
  }

  const project = result.data as { id: string }

  // Ajouter tous les agent_templates publiés au projet (service client pour bypasser RLS)
  const service = createServiceClient()
  const { data: templates } = await service
    .from('agent_templates')
    .select('id')
    .eq('is_published', true)
    .order('position', { ascending: true })

  if (templates && templates.length > 0) {
    await service.from('project_agents').insert(
      templates.map((t: { id: string }) => ({
        project_id: project.id,
        template_id: t.id,
      }))
    )
  }

  return Response.json({ project }, { status: 201 })
}
