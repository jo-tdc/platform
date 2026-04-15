import Link from 'next/link'

const NAV = [
  { href: '/admin/cohorts', label: 'Utilisateurs' },
  { href: '/admin/curriculum', label: 'Curriculum' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-8">
        <span className="text-sm font-semibold text-gray-900">Admin</span>
        <nav className="flex gap-1">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Retour à la plateforme
          </Link>
        </div>
      </header>
      <main className="flex flex-col">{children}</main>
    </div>
  )
}
