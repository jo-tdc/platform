import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserActivePlans } from '@/lib/utils/access'
import { agentTemplates } from '@/lib/seed/agent-templates'
import type { PlanType } from '@/lib/utils/types'

// POST /api/admin/seed/agents
// Insère les 4 agent_templates si la table est vide. Ne modifie rien si des données existent déjà.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const callerPlans = await getUserActivePlans(user.id)
  if (!callerPlans.some((p) => (['editor', 'admin'] as PlanType[]).includes(p))) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const service = createServiceClient()

  // Vérifie si la table est déjà peuplée
  const { count, error: countError } = await service
    .from('agent_templates')
    .select('id', { count: 'exact', head: true })

  if (countError) {
    return Response.json({ error: countError.message }, { status: 500 })
  }

  if (count && count > 0) {
    return Response.json({
      ok: false,
      message: `La table agent_templates contient déjà ${count} entrée(s). Aucune insertion effectuée.`,
      count,
    })
  }

  const { data, error } = await service
    .from('agent_templates')
    .insert(agentTemplates)
    .select('id, name, position')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    message: `${data.length} agent_templates insérés avec succès.`,
    agents: data,
  })
}
