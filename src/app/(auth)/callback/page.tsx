'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const next = new URLSearchParams(window.location.search).get('next') ?? '/dashboard'
    let done = false

    async function finish() {
      if (done) return
      done = true
      await fetch('/api/auth/sync', { method: 'POST' })
      router.replace(next)
    }

    // createBrowserClient détecte automatiquement ?code= (PKCE — Google OAuth, etc.)
    // et émet SIGNED_IN quand la session est établie
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        finish()
      }
    })

    // Flow implicite : tokens dans le hash fragment (magic link Supabase SMTP)
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token })
        // setSession déclenche SIGNED_IN → capturé par onAuthStateChange ci-dessus
      } else {
        subscription.unsubscribe()
        router.replace('/login?error=auth_failed')
      }
    } else if (!new URLSearchParams(window.location.search).get('code')) {
      // Ni hash ni code : rien à faire
      subscription.unsubscribe()
      router.replace('/login?error=auth_failed')
    }
    // Si ?code= présent : createBrowserClient gère automatiquement, on attend SIGNED_IN

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-400">Connexion en cours…</p>
    </div>
  )
}
