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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const service = await requireAdmin()
  if (!service) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const { target_cohort_id } = await req.json()
  if (!target_cohort_id) return Response.json({ error: 'target_cohort_id requis' }, { status: 400 })

  const { data: original } = await service.from('schedules').select('*').eq('id', id).single()
  if (!original) return Response.json({ error: 'Planning introuvable' }, { status: 404 })

  const { data: newSchedule, error: schedErr } = await service
    .from('schedules')
    .insert({ cohort_id: target_cohort_id, starts_at: original.starts_at, ends_at: original.ends_at, is_published: false })
    .select().single()
  if (schedErr) return Response.json({ error: schedErr.message }, { status: 500 })

  const { data: blocks } = await service.from('schedule_blocks').select('*').eq('schedule_id', id)
  if (blocks && blocks.length > 0) {
    const { error: blocksErr } = await service.from('schedule_blocks').insert(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      blocks.map(({ id: _id, schedule_id: _sid, created_at: _ca, ...rest }) => ({
        ...rest,
        schedule_id: newSchedule.id,
      }))
    )
    if (blocksErr) return Response.json({ error: blocksErr.message }, { status: 500 })
  }

  return Response.json({ schedule: newSchedule })
}
