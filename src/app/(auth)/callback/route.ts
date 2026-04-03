import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const authUser = data.session.user

  // Synchroniser l'utilisateur dans notre table `users` et lui assigner un plan
  try {
    const service = createServiceClient()

    // Upsert dans notre table users (clé : id = auth.uid)
    const upsertResult = await service.from('users').upsert(
      {
        id: authUser.id,
        email: authUser.email!,
        full_name:
          (authUser.user_metadata?.full_name as string | undefined) ??
          (authUser.user_metadata?.name as string | undefined) ??
          authUser.email!.split('@')[0],
        avatar_url: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    if (upsertResult.error) console.error('[callback] users upsert error:', upsertResult.error)

    // Vérifier si l'utilisateur a déjà un plan actif
    const planResult = await service
      .from('user_plans')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('is_active', true)
      .limit(1)

    if (planResult.error) console.error('[callback] plan select error:', planResult.error)

    const existingPlans = planResult.data as Array<{ id: string }> | null

    // Assigner le plan 'free' uniquement si aucun plan actif n'existe
    if (!existingPlans || existingPlans.length === 0) {
      const insertResult = await service.from('user_plans').insert({
        user_id: authUser.id,
        plan: 'free',
        is_active: true,
      })
      if (insertResult.error) console.error('[callback] user_plans insert error:', insertResult.error)
      else console.log('[callback] plan free assigned to', authUser.id)
    } else {
      console.log('[callback] plan already exists for', authUser.id)
    }
  } catch (err) {
    console.error('[callback] user sync error:', err)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
