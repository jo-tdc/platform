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
  const { data, error } = await service
    .from('schedules')
    .select('*, cohorts(id, name, batch_number)')
    .order('created_at')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ schedules: data ?? [] })
}

export async function POST(req: Request) {
  const service = await requireAdmin()
  if (!service) return Response.json({ error: 'Accès refusé' }, { status: 403 })
  const { cohort_id, starts_at, ends_at } = await req.json()
  if (!cohort_id || !starts_at || !ends_at) {
    return Response.json({ error: 'Champs requis manquants' }, { status: 400 })
  }
  const { data, error } = await service
    .from('schedules')
    .insert({ cohort_id, starts_at, ends_at })
    .select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ schedule: data })
}
