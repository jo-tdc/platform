import { createClient } from '@/lib/supabase/server'
import { getUserActivePlan } from '@/lib/utils/access'
import type { PlanType } from '@/lib/utils/types'

// GET /api/admin/cohorts — liste tous les batches
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const plan = await getUserActivePlan(user.id)
  if (!plan || !(['editor', 'admin'] as PlanType[]).includes(plan)) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { createServiceClient } = await import('@/lib/supabase/server')
  const service = createServiceClient()

  const { data, error } = await service
    .from('cohorts')
    .select('id, name, batch_number, is_open')
    .order('batch_number', { ascending: true, nullsFirst: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ cohorts: data ?? [] })
}
