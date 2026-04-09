import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { emailFirstConnection, emailReturningUser } from '@/lib/email/templates'
import { z } from 'zod'

const Schema = z.object({
  email: z.string().email(),
})

// POST /api/auth/magic-link
// Génère un magic link et envoie le bon template selon si c'est une première connexion ou non.
// Ne crée pas de compte — l'utilisateur doit déjà exister.
export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch {
    return Response.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Email invalide' }, { status: 422 })

  const { email } = parsed.data
  const service = createServiceClient()

  // Vérifie si l'utilisateur existe
  const { data: existing } = await service.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = existing?.users.find((u) => u.email === email)

  if (!existingUser) {
    return Response.json({ error: 'Aucun compte associé à cet email.' }, { status: 404 })
  }

  // Génère le magic link côté serveur
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/callback` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return Response.json({ error: linkError?.message ?? 'Erreur génération du lien' }, { status: 500 })
  }

  const magicLink = linkData.properties.action_link

  // Première connexion si jamais connecté
  const isFirstConnection = !existingUser.last_sign_in_at
  const template = isFirstConnection
    ? emailFirstConnection(magicLink)
    : emailReturningUser(magicLink)

  try {
    await sendEmail(email, template.subject, template.html)
  } catch (err) {
    console.error('[magic-link] Erreur envoi email:', err)
    return Response.json({ error: 'Erreur lors de l\'envoi de l\'email.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
