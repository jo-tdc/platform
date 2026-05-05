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

export async function GET(req: Request) {
  const service = await requireAdmin()
  if (!service) return Response.json({ error: 'Accès refusé' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const scheduleId = searchParams.get('scheduleId')
  if (!scheduleId) return Response.json({ error: 'scheduleId requis' }, { status: 400 })
  const { data, error } = await service
    .from('schedule_blocks')
    .select('*, mentors(id, first_name, job_title, photo_url)')
    .eq('schedule_id', scheduleId)
    .order('date').order('period')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ blocks: data ?? [] })
}

export async function POST(req: Request) {
  const service = await requireAdmin()
  if (!service) return Response.json({ error: 'Accès refusé' }, { status: 403 })
  const { schedule_id, date, period, type, title, mentor_id } = await req.json()
  if (!schedule_id || !date || !period || !type || !title) {
    return Response.json({ error: 'Champs requis manquants' }, { status: 400 })
  }
  const { data, error } = await service
    .from('schedule_blocks')
    .insert({ schedule_id, date, period, type, title, mentor_id: mentor_id || null })
    .select('*, mentors(id, first_name, job_title, photo_url)')
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ block: data })
}
