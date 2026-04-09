import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUserActivePlan } from '@/lib/utils/access'
import type { PlanType } from '@/lib/utils/types'

// GET /api/admin/users — liste tous les utilisateurs avec leur plan
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const plan = await getUserActivePlan(user.id)
  if (!plan || !(['editor', 'admin'] as PlanType[]).includes(plan)) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const service = createServiceClient()

  // Récupère tous les utilisateurs Supabase Auth
  const { data: authData, error: authError } = await service.auth.admin.listUsers({ perPage: 1000 })
  if (authError) return Response.json({ error: authError.message }, { status: 500 })

  // Récupère tous les plans
  const { data: plans } = await service
    .from('user_plans')
    .select('user_id, plan, is_active, started_at, expires_at')
    .eq('is_active', true)

  // Récupère tous les membres de cohorte avec le nom du batch
  const { data: members } = await service
    .from('cohort_members')
    .select('user_id, cohort_id, cohorts(name, batch_number)')

  // Grouper tous les plans par user_id
  const plansMap = new Map<string, string[]>()
  for (const p of (plans ?? [])) {
    const existing = plansMap.get(p.user_id) ?? []
    existing.push(p.plan)
    plansMap.set(p.user_id, existing)
  }

  const PLAN_PRIORITY: Record<string, number> = {
    admin: 7, editor: 6, bootcamp: 5, pro: 4, trial: 3, free: 2, starter_pack: 1,
  }

  type MemberRow = { user_id: string; cohort_id: string; cohorts: { name: string; batch_number: number | null } | null }
  const cohortMap = new Map(
    ((members ?? []) as unknown as MemberRow[]).map((m) => [
      m.user_id,
      {
        cohort_id: m.cohort_id,
        cohort_name: m.cohorts?.batch_number != null
          ? `Batch ${m.cohorts.batch_number}`
          : (m.cohorts?.name ?? null),
      },
    ])
  )

  const users = authData.users.map((u) => {
    const userPlans = plansMap.get(u.id) ?? []
    const primaryPlan = userPlans.sort((a, b) => (PLAN_PRIORITY[b] ?? 0) - (PLAN_PRIORITY[a] ?? 0))[0] ?? null
    return {
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      plan: primaryPlan,
      plans: userPlans,
      cohort_id: cohortMap.get(u.id)?.cohort_id ?? null,
      cohort_name: cohortMap.get(u.id)?.cohort_name ?? null,
    }
  })

  // Tri par date de création desc
  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return Response.json({ users })
}
