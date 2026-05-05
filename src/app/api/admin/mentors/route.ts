import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserActivePlans } from '@/lib/utils/access'
import type { PlanType } from '@/lib/utils/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const plans = await getUserActivePlans(user.id)
  if (!plans.some((p) => (['editor', 'admin'] as PlanType[]).includes(p))) return null
  return createServiceClient()
}

export async function GET() {
  const service = await requireAdmin()
  if (!service) return Response.json({ error: 'Accès refusé' }, { status: 403 })
  const { data, error } = await service.from('mentors').select('*').order('first_name')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ mentors: data ?? [] })
}

export async function POST(req: Request) {
  const service = await requireAdmin()
  if (!service) return Response.json({ error: 'Accès refusé' }, { status: 403 })
  const { first_name, job_title, photo_url } = await req.json()
  if (!first_name) return Response.json({ error: 'Prénom requis' }, { status: 400 })
  const { data, error } = await service
    .from('mentors')
    .insert({ first_name, job_title: job_title || null, photo_url: photo_url || null })
    .select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ mentor: data })
}
