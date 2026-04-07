import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  email: z.string().email(),
})

// POST /api/access/starter-pack
// Crée le compte, assigne starter_pack, notifie HubSpot, envoie le magic link
export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: 'Corps invalide' }, { status: 400 }) }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Email invalide' }, { status: 422 })

  const { email } = parsed.data
  const service = createServiceClient()

  // 1. Trouver ou créer l'utilisateur
  const { data: existingUsers } = await service.auth.admin.listUsers()
  const existingAuthUser = existingUsers?.users?.find((u) => u.email === email)

  let userId: string

  if (existingAuthUser) {
    userId = existingAuthUser.id
  } else {
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
    .from('users').select('id').eq('id', userId).maybeSingle()

  if (!existingPublicUser) {
    await service.from('users').insert({
      id: userId,
      email,
      full_name: email.split('@')[0],
    })
  }

  // 3. Ajouter starter_pack si pas déjà présent
  const { data: existingPlans } = await service
    .from('user_plans').select('plan').eq('user_id', userId).eq('is_active', true)

  const hasStarterPack = (existingPlans ?? []).some((p) => p.plan === 'starter_pack')

  if (!hasStarterPack) {
    await service.from('user_plans').insert({
      user_id: userId,
      plan: 'starter_pack',
      is_active: true,
    })
  }

  // 4. Notifier HubSpot — créer/mettre à jour le contact avec le touch point Figma Basics
  const hubspotToken = process.env.HUBSPOT_API_TOKEN
  if (hubspotToken) {
    try {
      // Recherche du contact par email
      const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hubspotToken}`,
        },
        body: JSON.stringify({
          filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
          properties: ['email', 'hs_object_id'],
        }),
      })
      const searchData = await searchRes.json()
      const contactId = searchData.results?.[0]?.id

      if (contactId) {
        // Mettre à jour le contact existant
        await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${hubspotToken}`,
          },
          body: JSON.stringify({
            properties: {
              first_touchpoint: 'Figma Basics',
              touchpoints: 'Figma Basics',
            },
          }),
        })
      } else {
        // Créer le contact
        await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${hubspotToken}`,
          },
          body: JSON.stringify({
            properties: {
              email,
              first_touchpoint: 'Figma Basics',
              touchpoints: 'Figma Basics',
            },
          }),
        })
      }
    } catch (err) {
      console.error('[starter-pack] HubSpot error:', err)
      // On ne bloque pas si HubSpot échoue
    }
  }

  // 5. Envoyer le magic link par email via Supabase
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://build.thedesigncrew.co'
  const { error: otpError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/learn` },
  })

  if (otpError) {
    return Response.json({ error: `Erreur envoi email : ${otpError.message}` }, { status: 500 })
  }

  return Response.json({ ok: true })
}
