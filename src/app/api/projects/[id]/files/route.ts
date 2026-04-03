import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const AddLinkSchema = z.object({
  file_name: z.string().min(1).max(200),
  file_type: z.literal('link'),
  storage_url: z.string().url(),
})

// GET /api/projects/[id]/files
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const projectCheck = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (projectCheck.error) return Response.json({ error: 'Projet introuvable' }, { status: 404 })

  const result = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', id)
    .order('uploaded_at', { ascending: false })

  return Response.json({ files: result.data ?? [] })
}

// POST /api/projects/[id]/files — ajouter un lien (les uploads PDF/image passent par Storage)
export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const projectCheck = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (projectCheck.error) return Response.json({ error: 'Projet introuvable' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = AddLinkSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  const result = await supabase
    .from('project_files')
    .insert({
      project_id: id,
      file_name: parsed.data.file_name,
      file_type: parsed.data.file_type,
      storage_url: parsed.data.storage_url,
    })
    .select()
    .single()

  if (result.error) {
    return Response.json({ error: 'Erreur lors de l\'ajout du fichier' }, { status: 500 })
  }

  return Response.json({ file: result.data }, { status: 201 })
}
