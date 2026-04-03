import type { PlanType } from '@/lib/utils/types'

// Plans qui peuvent accéder aux modules "pro"
const PRO_PLANS: PlanType[] = ['pro', 'bootcamp', 'editor', 'admin']

/**
 * Récupère le plan actif d'un utilisateur.
 * À appeler côté serveur uniquement (Route Handler, Server Component).
 */
export async function getUserActivePlan(userId: string): Promise<PlanType | null> {
  // Utilise le service client pour bypasser le RLS (pas de policy SELECT sur user_plans)
  const { createServiceClient } = await import('@/lib/supabase/server')
  const supabase = createServiceClient()

  const result = await supabase
    .from('user_plans')
    .select('plan')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)

  const rows = result.data as Array<{ plan: PlanType }> | null
  return rows?.[0]?.plan ?? null
}

/**
 * Vérifie si un plan permet d'accéder à un module selon son `required_plan`.
 */
export function canAccessModule(
  userPlan: PlanType | null,
  requiredPlan: 'free' | 'pro'
): boolean {
  if (!userPlan) return false
  if (requiredPlan === 'free') return true
  return PRO_PLANS.includes(userPlan)
}

/**
 * Vérifie si un plan permet d'accéder au mode Apprendre.
 */
export function canAccessLearnMode(plan: PlanType | null): boolean {
  if (!plan) return false
  const learnPlans: PlanType[] = ['bootcamp', 'free', 'pro', 'editor', 'admin']
  return learnPlans.includes(plan)
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
 * Utilisé pour le verrouillage linéaire.
 */
export async function hasCompletedAllLessonsInModule(
  userId: string,
  moduleId: string
): Promise<boolean> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const [lessonsResult, completionsResult] = await Promise.all([
    supabase
      .from('lessons')
      .select('id')
      .eq('module_id', moduleId)
      .eq('is_published', true),
    supabase
      .from('lesson_completions')
      .select('lesson_id')
      .eq('user_id', userId),
  ])

  const lessonIds = (lessonsResult.data as Array<{ id: string }> | null ?? []).map((l) => l.id)
  const completedIds = new Set(
    (completionsResult.data as Array<{ lesson_id: string }> | null ?? []).map((c) => c.lesson_id)
  )

  return lessonIds.every((id) => completedIds.has(id))
}
