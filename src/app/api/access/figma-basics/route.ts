import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { emailFigmaBasics } from '@/lib/email/templates'
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
  const { data: existingUsers } = await service.auth.admin.listUsers({ perPage: 1000 })
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
  let hubspotLog: string | null = null

  if (!hubspotToken) {
    hubspotLog = 'HUBSPOT_API_TOKEN manquant'
  } else {
    try {
      // Recherche du contact par email
      const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hubspotToken}` },
        body: JSON.stringify({
          filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
          properties: ['email', 'hs_object_id', 'touchpoints', 'first_touchpoint'],
        }),
      })
      const searchData = await searchRes.json()

      if (!searchRes.ok) {
        hubspotLog = `Search failed ${searchRes.status}: ${JSON.stringify(searchData)}`
      } else {
        const contactId = searchData.results?.[0]?.id

        if (contactId) {
          const existingProps = searchData.results[0].properties ?? {}
          const existingTouchpoints: string = existingProps.touchpoints ?? ''
          const existingFirst: string = existingProps.first_touchpoint ?? ''

          // Ajouter 'Figma Basics' sans écraser les touchpoints existants
          const touchpointsList = existingTouchpoints
            ? existingTouchpoints.split(';').map((t: string) => t.trim()).filter(Boolean)
            : []
          if (!touchpointsList.includes('Figma Basics')) touchpointsList.push('Figma Basics')
          const newTouchpoints = touchpointsList.join(';')
          const newFirstTouchpoint = existingFirst || 'Figma Basics'

          const patchRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hubspotToken}` },
            body: JSON.stringify({ properties: { first_touchpoint: newFirstTouchpoint, touchpoints: newTouchpoints } }),
          })
          const patchData = await patchRes.json()
          if (!patchRes.ok) {
            hubspotLog = `PATCH failed ${patchRes.status}: ${JSON.stringify(patchData)}`
          } else {
            hubspotLog = `Contact mis à jour (id: ${contactId})`
          }
        } else {
          const postRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hubspotToken}` },
            body: JSON.stringify({ properties: { email, first_touchpoint: 'Figma Basics', touchpoints: 'Figma Basics' } }),
          })
          const postData = await postRes.json()
          if (!postRes.ok) {
            hubspotLog = `POST failed ${postRes.status}: ${JSON.stringify(postData)}`
          } else {
            hubspotLog = `Contact créé (id: ${postData.id})`
          }
        }
      }
    } catch (err) {
      hubspotLog = `Exception: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  if (hubspotLog) console.log('[figma-basics] HubSpot:', hubspotLog)

  // 5. Générer le magic link et envoyer via Resend avec le template Figma Basics
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/callback` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return Response.json({ error: linkError?.message ?? 'Erreur génération du lien', hubspot: hubspotLog }, { status: 500 })
  }

  const template = emailFigmaBasics(linkData.properties.action_link)

  try {
    await sendEmail(email, template.subject, template.html)
  } catch (err) {
    console.error('[figma-basics] Erreur envoi email:', err)
    return Response.json({ error: 'Erreur lors de l\'envoi de l\'email.', hubspot: hubspotLog }, { status: 500 })
  }

  return Response.json({ ok: true, hubspot: hubspotLog })
}
