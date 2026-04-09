'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient()

      // Lire les params directement depuis window.location (évite useSearchParams + Suspense)
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')
      const next = searchParams.get('next') ?? '/dashboard'

      let sessionOk = false

      if (code) {
        // Flow PKCE (Google OAuth)
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) sessionOk = true
      } else {
        // Flow implicite — tokens dans le hash fragment
        const params = new URLSearchParams(window.location.hash.replace('#', ''))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (!error) sessionOk = true
        }
      }

      if (!sessionOk) {
        router.replace('/login?error=auth_failed')
        return
      }

      await fetch('/api/auth/sync', { method: 'POST' })
      router.replace(next)
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-400">Connexion en cours…</p>
    </div>
  )
}
