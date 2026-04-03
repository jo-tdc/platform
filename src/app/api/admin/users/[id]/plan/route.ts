import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserActivePlan } from '@/lib/utils/access'
import type { PlanType } from '@/lib/utils/types'
import { z } from 'zod'

const Schema = z.object({
  plan: z.enum(['free', 'trial', 'bootcamp', 'pro', 'editor', 'admin']),
})

type Params = { params: Promise<{ id: string }> }

// PATCH /api/admin/users/[id]/plan — change le plan d'un utilisateur
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const plan = await getUserActivePlan(user.id)
  if (!plan || !(['editor', 'admin'] as PlanType[]).includes(plan)) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return Response.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Plan invalide' }, { status: 422 })

  const service = createServiceClient()

  // Désactive l'ancien plan s'il existe
  await service
    .from('user_plans')
    .update({ is_active: false })
    .eq('user_id', id)
    .eq('is_active', true)

  // Insère le nouveau plan
  const { error } = await service
    .from('user_plans')
    .insert({ user_id: id, plan: parsed.data.plan, is_active: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
