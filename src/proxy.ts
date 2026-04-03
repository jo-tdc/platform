import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import type { PlanType } from '@/lib/utils/types'

// Plans autorisés par groupe de routes
const PLANS_AI: PlanType[] = ['bootcamp', 'free', 'pro', 'editor', 'admin']
const PLANS_PRACTICE: PlanType[] = ['bootcamp', 'trial', 'pro', 'editor', 'admin']
const PLANS_ADMIN: PlanType[] = ['editor', 'admin']

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Les webhooks Stripe n'ont pas de session — la vérification se fait
  // via la signature dans la route elle-même
  if (pathname.startsWith('/api/webhooks/stripe')) {
    return NextResponse.next()
  }

  const { supabaseResponse, supabase, user } = await updateSession(request)

  // Routes app et admin : session obligatoire
  const requiresSession =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/learn') ||
    pathname.startsWith('/practice') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/ai/') ||
    pathname.startsWith('/api/practice/') ||
    pathname.startsWith('/api/projects/')

  if (requiresSession && !user) {
    // Pour les routes API, retourner 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    // Pour les pages, rediriger vers login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Vérification de plan pour les routes qui le nécessitent
  if (user && (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/ai/') ||
    pathname.startsWith('/api/practice/')
  )) {
    const planQuery = await supabase
      .from('user_plans')
      .select('plan')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)

    const planRows = planQuery.data as Array<{ plan: PlanType }> | null
    const plan = planRows?.[0]?.plan

    if (pathname.startsWith('/admin')) {
      if (!plan || !PLANS_ADMIN.includes(plan)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
        }
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    if (pathname.startsWith('/api/ai/')) {
      if (!plan || !PLANS_AI.includes(plan)) {
        return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
      }
    }

    if (pathname.startsWith('/api/practice/')) {
      if (!plan || !PLANS_PRACTICE.includes(plan)) {
        return NextResponse.json({ error: 'Plan insuffisant' }, { status: 403 })
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Exclure les fichiers statiques et les routes internes Next.js
     * mais inclure toutes les pages et routes API
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
