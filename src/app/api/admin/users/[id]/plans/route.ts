import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserActivePlans } from '@/lib/utils/access'
import type { PlanType } from '@/lib/utils/types'
import { z } from 'zod'

const Schema = z.object({
  plans: z.array(z.enum(['free', 'trial', 'bootcamp', 'pro', 'editor', 'admin', 'starter_pack'])),
})

type Params = { params: Promise<{ id: string }> }

// PUT /api/admin/users/[id]/plans — remplace tous les plans actifs d'un utilisateur
export async function PUT(request: Request, { params }: Params) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const callerPlans = await getUserActivePlans(user.id)
  if (!callerPlans.some((p) => (['editor', 'admin'] as PlanType[]).includes(p))) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return Response.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Plans invalides' }, { status: 422 })

  const newPlans = parsed.data.plans
  const service = createServiceClient()

  // Récupérer les plans actuellement actifs
  const { data: currentRows } = await service
    .from('user_plans')
    .select('id, plan')
    .eq('user_id', id)
    .eq('is_active', true)

  const currentPlans = (currentRows ?? []).map((r) => r.plan as PlanType)

  // Désactiver les plans retirés
  const toRemove = currentPlans.filter((p) => !newPlans.includes(p))
  if (toRemove.length > 0) {
    await service
      .from('user_plans')
      .update({ is_active: false })
      .eq('user_id', id)
      .eq('is_active', true)
      .in('plan', toRemove)
  }

  // Ajouter les nouveaux plans
  const toAdd = newPlans.filter((p) => !currentPlans.includes(p as PlanType))
  if (toAdd.length > 0) {
    await service.from('user_plans').insert(
      toAdd.map((plan) => ({ user_id: id, plan, is_active: true }))
    )
  }

  return Response.json({ ok: true, plans: newPlans })
}
