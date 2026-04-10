import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserActivePlans } from '@/lib/utils/access'
import { sendEmail } from '@/lib/email/send'
import { emailFirstConnection } from '@/lib/email/templates'
import type { PlanType } from '@/lib/utils/types'
import { z } from 'zod'

const Schema = z.object({
  email: z.string().email(),
  plan: z.enum(['free', 'trial', 'bootcamp', 'pro', 'editor', 'admin', 'starter_pack']),
  cohortId: z.string().uuid().optional(),
})

// POST /api/admin/users/invite
// Crée le compte sans envoyer d'email, génère un lien de connexion à partager manuellement.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const callerPlans = await getUserActivePlans(user.id)
  if (!callerPlans.some((p) => (["editor", "admin"] as PlanType[]).includes(p))) {
    return Response.json({ error: "Accès refusé" }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return Response.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Données invalides' }, { status: 422 })

  const service = createServiceClient()

  // Vérifie si l'utilisateur existe déjà
  const { data: existing } = await service.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = existing?.users.find((u) => u.email === parsed.data.email)

  let targetUserId: string

  if (existingUser) {
    targetUserId = existingUser.id
  } else {
    // Crée le compte directement, email déjà confirmé — aucun email envoyé
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email: parsed.data.email,
      email_confirm: true,
    })
    if (createError) return Response.json({ error: createError.message }, { status: 500 })
    targetUserId = created.user.id
  }

  // Garantit l'existence de la ligne dans public.users
  // (pas de trigger via l'API admin — on insère manuellement si absent)
  const { data: existingPublicUser } = await service
    .from('users')
    .select('id')
    .eq('id', targetUserId)
    .maybeSingle()

  if (!existingPublicUser) {
    const { error: userInsertError } = await service.from('users').insert({
      id: targetUserId,
      email: parsed.data.email,
      full_name: parsed.data.email.split('@')[0],
    })
    if (userInsertError) {
      return Response.json({ error: `Erreur création profil : ${userInsertError.message}` }, { status: 500 })
    }
  }

  // Désactive l'ancien plan
  await service
    .from('user_plans')
    .update({ is_active: false })
    .eq('user_id', targetUserId)
    .eq('is_active', true)

  // Assigne le nouveau plan
  const { error: planError } = await service
    .from('user_plans')
    .insert({ user_id: targetUserId, plan: parsed.data.plan, is_active: true })

  if (planError) return Response.json({ error: planError.message }, { status: 500 })

  // Affecte au batch si fourni
  if (parsed.data.cohortId) {
    // Supprime l'ancienne appartenance éventuelle
    await service
      .from('cohort_members')
      .delete()
      .eq('user_id', targetUserId)

    await service
      .from('cohort_members')
      .insert({ user_id: targetUserId, cohort_id: parsed.data.cohortId })
  }

  // Génère le magic link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: parsed.data.email,
    options: { redirectTo: `${appUrl}/callback` },
  })

  const accessLink = linkError ? null : linkData?.properties?.action_link ?? null

  // Envoie le mail "première connexion" si Resend est configuré
  let emailSent = false
  if (accessLink && process.env.RESEND_API_KEY) {
    try {
      const template = emailFirstConnection(accessLink)
      await sendEmail(parsed.data.email, template.subject, template.html)
      emailSent = true
    } catch (err) {
      console.error('[invite] Erreur envoi email:', err)
    }
  }

  return Response.json({
    ok: true,
    userId: targetUserId,
    existing: !!existingUser,
    accessLink: emailSent ? null : accessLink, // si mail envoyé, pas besoin d'afficher le lien
    emailSent,
  })
}
