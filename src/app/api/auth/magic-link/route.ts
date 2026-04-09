import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { emailFirstConnection, emailReturningUser } from '@/lib/email/templates'
import { z } from 'zod'

const Schema = z.object({
  email: z.string().email(),
})

// POST /api/auth/magic-link
// Si RESEND_API_KEY est configurée : génère le lien + envoie le bon template (première connexion ou retour).
// Sinon : fallback sur signInWithOtp Supabase (Resend SMTP) pour ne pas bloquer la connexion.
export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch {
    return Response.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Email invalide' }, { status: 422 })

  const { email } = parsed.data
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // — Fallback si Resend non configuré —
  if (!process.env.RESEND_API_KEY) {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${appUrl}/callback` },
    })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  // — Chemin principal (Resend configuré) —
  const service = createServiceClient()

  const { data: existing } = await service.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = existing?.users.find((u) => u.email === email)

  if (!existingUser) {
    return Response.json({ error: 'Aucun compte associé à cet email.' }, { status: 404 })
  }

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/callback` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return Response.json({ error: linkError?.message ?? 'Erreur génération du lien' }, { status: 500 })
  }

  const isFirstConnection = !existingUser.last_sign_in_at
  const template = isFirstConnection
    ? emailFirstConnection(linkData.properties.action_link)
    : emailReturningUser(linkData.properties.action_link)

  try {
    await sendEmail(email, template.subject, template.html)
  } catch (err) {
    console.error('[magic-link] Erreur envoi email:', err)
    return Response.json({ error: "Erreur lors de l'envoi de l'email." }, { status: 500 })
  }

  return Response.json({ ok: true })
}
