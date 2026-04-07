import { createServiceClient } from '@/lib/supabase/server'

// POST /api/webhooks/hubspot
// Appelé par HubSpot workflow après soumission de formulaire.
// Crée le compte si inexistant, ajoute le plan starter_pack (cumulatif), retourne un magic link.
export async function POST(request: Request) {
  // Vérification du secret partagé
  const secret = request.headers.get('x-hubspot-secret')
  if (!secret || secret !== process.env.HUBSPOT_WEBHOOK_SECRET) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { email } = body as { email?: string }
  if (!email || typeof email !== 'string') {
    return Response.json({ error: 'email requis' }, { status: 400 })
  }

  const service = createServiceClient()

  // 1. Trouver ou créer l'utilisateur dans auth.users
  const { data: existingUsers } = await service.auth.admin.listUsers()
  const existingAuthUser = existingUsers?.users?.find((u) => u.email === email)

  let userId: string

  if (existingAuthUser) {
    userId = existingAuthUser.id
  } else {
    // Créer le compte sans envoyer d'email (on enverra le magic link séparément)
    const { data: newUser, error: createError } = await service.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (createError || !newUser.user) {
      return Response.json({ error: `Erreur création compte : ${createError?.message}` }, { status: 500 })
    }
    userId = newUser.user.id
  }

  // 2. S'assurer que public.users existe
  const { data: existingPublicUser } = await service
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (!existingPublicUser) {
    const { error: userInsertError } = await service.from('users').insert({
      id: userId,
      email,
      full_name: email.split('@')[0],
    })
    if (userInsertError) {
      return Response.json({ error: `Erreur profil : ${userInsertError.message}` }, { status: 500 })
    }
  }

  // 3. Vérifier les plans existants
  const { data: existingPlans } = await service
    .from('user_plans')
    .select('plan')
    .eq('user_id', userId)
    .eq('is_active', true)

  const currentPlans = (existingPlans ?? []).map((r) => r.plan)
  const hasStarterPack = currentPlans.includes('starter_pack')

  // 4. Ajouter starter_pack si pas déjà présent (cumulatif, ne touche pas aux autres plans)
  if (!hasStarterPack) {
    const { error: planError } = await service.from('user_plans').insert({
      user_id: userId,
      plan: 'starter_pack',
      is_active: true,
    })
    if (planError) {
      return Response.json({ error: `Erreur assignation plan : ${planError.message}` }, { status: 500 })
    }
  }

  // 5. Générer un magic link (pas d'email envoyé — HubSpot s'en charge)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://build.thedesigncrew.co'
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/learn` },
  })

  if (linkError || !linkData) {
    return Response.json({ error: `Erreur génération lien : ${linkError?.message}` }, { status: 500 })
  }

  return Response.json({
    magic_link: linkData.properties.action_link,
    user_id: userId,
    plan: 'starter_pack',
    already_had_starter_pack: hasStarterPack,
  })
}
