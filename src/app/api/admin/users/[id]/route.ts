import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserActivePlans } from '@/lib/utils/access'
import type { PlanType } from '@/lib/utils/types'

type Params = { params: Promise<{ id: string }> }

// DELETE /api/admin/users/[id] — supprime un compte utilisateur
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const callerPlans = await getUserActivePlans(user.id)
  if (!callerPlans.some((p) => (["editor", "admin"] as PlanType[]).includes(p))) {
    return Response.json({ error: "Accès refusé" }, { status: 403 })
  }

  // Empêche de se supprimer soi-même
  if (id === user.id) {
    return Response.json({ error: 'Impossible de supprimer son propre compte' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service.auth.admin.deleteUser(id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
