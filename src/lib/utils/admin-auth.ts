import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

type AdminAuthResult =
  | { userId: string; error: null }
  | { userId: null; error: Response }

export async function requireAdminAuth(): Promise<AdminAuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { userId: null, error: Response.json({ error: 'Non authentifié' }, { status: 401 }) }
  }

  const service = createServiceClient()
  const result = await service
    .from('user_plans')
    .select('plan')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)

  const plan = (result.data as Array<{ plan: string }> | null)?.[0]?.plan

  if (!plan || !['editor', 'admin'].includes(plan)) {
    return { userId: null, error: Response.json({ error: 'Accès refusé' }, { status: 403 }) }
  }

  return { userId: user.id, error: null }
}
