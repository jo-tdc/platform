import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Navbar */}
      <header className="h-14 border-b border-gray-200 flex items-center px-6 gap-6 flex-shrink-0">
        <Link href="/dashboard" className="font-semibold text-gray-900 text-sm">
          Plateforme
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/learn"
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Apprendre
          </Link>
          <Link
            href="/practice"
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Pratiquer
          </Link>
        </nav>

        <div className="ml-auto">
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
