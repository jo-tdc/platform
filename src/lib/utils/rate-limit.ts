import { createClient } from '@/lib/supabase/server'

const DEFAULT_DAILY_LIMIT = 20

/**
 * Vérifie si un utilisateur en plan "trial" a dépassé sa limite quotidienne.
 * Les utilisateurs non-trial ne sont jamais bloqués par cette fonction.
 */
export async function checkTrialRateLimit(userId: string): Promise<{
  allowed: boolean
  messagesUsed: number
  limit: number
}> {
  const supabase = await createClient()
  const limit = parseInt(process.env.TRIAL_DAILY_MESSAGE_LIMIT ?? String(DEFAULT_DAILY_LIMIT), 10)

  // Vérifier si l'utilisateur est bien en plan trial actif
  const planResult = await supabase
    .from('user_plans')
    .select('plan, expires_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)

  const planRows = planResult.data as Array<{ plan: string; expires_at: string | null }> | null
  const activePlan = planRows?.[0]

  // Si pas de plan trial, on laisse passer (les autres plans ne sont pas limités ici)
  if (!activePlan || activePlan.plan !== 'trial') {
    return { allowed: true, messagesUsed: 0, limit }
  }

  // Vérifier expiration du trial
  if (activePlan.expires_at && new Date(activePlan.expires_at) < new Date()) {
    return { allowed: false, messagesUsed: limit, limit }
  }

  // Lire la vue trial_daily_usage
  const usageResult = await supabase
    .from('trial_daily_usage')
    .select('messages_today')
    .eq('user_id', userId)
    .limit(1)

  const usageRows = usageResult.data as Array<{ messages_today: number | null }> | null
  const messagesUsed = usageRows?.[0]?.messages_today ?? 0

  return {
    allowed: messagesUsed < limit,
    messagesUsed,
    limit,
  }
}
