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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const service = await requireAdmin()
  if (!service) return Response.json({ error: 'Accès refusé' }, { status: 403 })
  const { id } = await params
  const { first_name, job_title, photo_url } = await req.json()
  const { data, error } = await service
    .from('mentors')
    .update({ first_name, job_title: job_title || null, photo_url: photo_url || null })
    .eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ mentor: data })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const service = await requireAdmin()
  if (!service) return Response.json({ error: 'Accès refusé' }, { status: 403 })
  const { id } = await params
  const { error } = await service.from('mentors').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
