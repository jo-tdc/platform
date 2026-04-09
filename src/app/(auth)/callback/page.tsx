'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient()
      const code = searchParams.get('code')
      const next = searchParams.get('next') ?? '/dashboard'

      let sessionOk = false

      if (code) {
        // Flow PKCE (Google OAuth, etc.)
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) sessionOk = true
      } else {
        // Flow implicite — tokens dans le hash fragment
        const hash = window.location.hash
        if (hash) {
          const params = new URLSearchParams(hash.replace('#', ''))
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (!error) sessionOk = true
          }
        }
      }

      if (!sessionOk) {
        router.replace('/login?error=auth_failed')
        return
      }

      // Sync utilisateur (upsert public.users + plan free si aucun plan)
      await fetch('/api/auth/sync', { method: 'POST' })

      router.replace(next)
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-400">Connexion en cours…</p>
    </div>
  )
}
