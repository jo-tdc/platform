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
  const { starts_at, ends_at, is_published } = await req.json()
  const update: Record<string, unknown> = {}
  if (starts_at !== undefined) update.starts_at = starts_at
  if (ends_at !== undefined) update.ends_at = ends_at
  if (is_published !== undefined) update.is_published = is_published
  const { data, error } = await service
    .from('schedules').update(update).eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ schedule: data })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const service = await requireAdmin()
  if (!service) return Response.json({ error: 'Accès refusé' }, { status: 403 })
  const { id } = await params
  const { error } = await service.from('schedules').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
