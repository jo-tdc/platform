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
  const { type, title, mentor_id } = await req.json()
  const { data, error } = await service
    .from('schedule_blocks')
    .update({ type, title, mentor_id: mentor_id || null })
    .eq('id', id)
    .select('*, mentors(id, first_name, job_title, photo_url)')
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ block: data })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const service = await requireAdmin()
  if (!service) return Response.json({ error: 'Accès refusé' }, { status: 403 })
  const { id } = await params
  const { error } = await service.from('schedule_blocks').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
