import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/auth/sync
// Appelé après connexion : upsert dans public.users + assigne le plan free si aucun plan actif
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const service = createServiceClient()

  await service.from('users').upsert(
    {
      id: user.id,
      email: user.email!,
      full_name:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        user.email!.split('@')[0],
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  const { data: existingPlans } = await service
    .from('user_plans')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)

  if (!existingPlans || existingPlans.length === 0) {
    await service.from('user_plans').insert({
      user_id: user.id,
      plan: 'free',
      is_active: true,
    })
  }

  return Response.json({ ok: true })
}
