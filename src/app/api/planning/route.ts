import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const service = createServiceClient()

  const { data: membership } = await service
    .from('cohort_members')
    .select('cohort_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return Response.json({ schedule: null, blocks: [] })

  const { data: schedule } = await service
    .from('schedules')
    .select('*')
    .eq('cohort_id', membership.cohort_id)
    .single()

  if (!schedule) return Response.json({ schedule: null, blocks: [] })

  const { data: blocks } = await service
    .from('schedule_blocks')
    .select('*, mentors(id, first_name, job_title, photo_url)')
    .eq('schedule_id', schedule.id)
    .order('date').order('period')

  return Response.json({ schedule, blocks: blocks ?? [] })
}
