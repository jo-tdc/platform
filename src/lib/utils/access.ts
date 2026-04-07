import type { PlanType } from '@/lib/utils/types'

// Plans qui peuvent accéder aux modules "pro"
const PRO_PLANS: PlanType[] = ['pro', 'bootcamp', 'editor', 'admin']

/**
 * Récupère le plan actif d'un utilisateur (rétrocompatibilité — retourne le plan le plus élevé).
 */
export async function getUserActivePlan(userId: string): Promise<PlanType | null> {
  const plans = await getUserActivePlans(userId)
  return plans[0] ?? null
}

/**
 * Récupère tous les plans actifs d'un utilisateur (tags cumulatifs).
 * Retourne les plans dans l'ordre de priorité décroissante.
 */
export async function getUserActivePlans(userId: string): Promise<PlanType[]> {
  const { createServiceClient } = await import('@/lib/supabase/server')
  const supabase = createServiceClient()

  const result = await supabase
    .from('user_plans')
    .select('plan')
    .eq('user_id', userId)
    .eq('is_active', true)

  const rows = result.data as Array<{ plan: PlanType }> | null
  if (!rows || rows.length === 0) return []

  // Tri par priorité décroissante
  const priority: Record<PlanType, number> = {
    admin: 7, editor: 6, bootcamp: 5, pro: 4, trial: 3, free: 2, starter_pack: 1,
  }
  return rows.map((r) => r.plan).sort((a, b) => (priority[b] ?? 0) - (priority[a] ?? 0))
}

/**
 * Vérifie si un plan (ou ensemble de plans) permet d'accéder à un module selon son `required_plan`.
 */
export function canAccessModule(
  userPlan: PlanType | PlanType[] | null,
  requiredPlan: 'free' | 'pro'
): boolean {
  if (!userPlan) return false
  const plans = Array.isArray(userPlan) ? userPlan : [userPlan]
  if (plans.length === 0) return false
  if (requiredPlan === 'free') return true
  return plans.some((p) => PRO_PLANS.includes(p))
}

/**
 * Vérifie si un plan (ou ensemble de plans) donne accès à un contenu donné.
 * - Pour starter_pack uniquement : accès restreint aux contenus `starter_pack_accessible`
 * - Pour tout autre plan : accès normal (filtrage au niveau module)
 */
export function canAccessContent(
  userPlans: PlanType[],
  contentStarterPackAccessible: boolean
): boolean {
  if (userPlans.length === 0) return false
  const isStarterPackOnly = userPlans.length === 1 && userPlans[0] === 'starter_pack'
  if (isStarterPackOnly) return contentStarterPackAccessible
  return true
}

/**
 * Vérifie si un plan permet d'accéder au mode Apprendre.
 */
export function canAccessLearnMode(plan: PlanType | PlanType[] | null): boolean {
  if (!plan) return false
  const plans = Array.isArray(plan) ? plan : [plan]
  const learnPlans: PlanType[] = ['bootcamp', 'free', 'pro', 'editor', 'admin', 'starter_pack']
  return plans.some((p) => learnPlans.includes(p))
}

/**
 * Vérifie si un plan permet d'accéder au mode Pratiquer.
 */
export function canAccessPracticeMode(plan: PlanType | null): boolean {
  if (!plan) return false
  const practicePlans: PlanType[] = ['bootcamp', 'trial', 'pro', 'editor', 'admin']
  return practicePlans.includes(plan)
}

/**
 * Vérifie si un utilisateur a complété toutes les leçons d'un module.
 */
export async function hasCompletedAllLessonsInModule(
  userId: string,
  moduleId: string
): Promise<boolean> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const [lessonsResult, completionsResult] = await Promise.all([
    supabase.from('lessons').select('id').eq('module_id', moduleId).eq('is_published', true),
    supabase.from('lesson_completions').select('lesson_id').eq('user_id', userId),
  ])

  const lessonIds = (lessonsResult.data as Array<{ id: string }> | null ?? []).map((l) => l.id)
  const completedIds = new Set(
    (completionsResult.data as Array<{ lesson_id: string }> | null ?? []).map((c) => c.lesson_id)
  )

  return lessonIds.every((id) => completedIds.has(id))
}
