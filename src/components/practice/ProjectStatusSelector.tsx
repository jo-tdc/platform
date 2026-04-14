'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'active' | 'done' | 'deleted'

const STATUSES: { value: Status; label: string; className: string }[] = [
  { value: 'active', label: 'Active', className: 'bg-green-50 text-green-700 hover:bg-green-100' },
  { value: 'done', label: 'Done', className: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
  { value: 'deleted', label: 'Deleted', className: 'bg-red-50 text-red-700 hover:bg-red-100' },
]

type Props = {
  projectId: string
  initialStatus: string
}

export default function ProjectStatusSelector({ projectId, initialStatus }: Props) {
  const [status, setStatus] = useState<Status>(
    (initialStatus as Status) ?? 'active'
  )
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const current = STATUSES.find((s) => s.value === status) ?? STATUSES[0]

  async function handleSelect(next: Status) {
    if (next === status) { setOpen(false); return }
    setSaving(true)
    setOpen(false)

    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })

    if (res.ok) {
      setStatus(next)
      if (next === 'deleted') {
        router.push('/practice')
      } else {
        router.refresh()
      }
    }

    setSaving(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${current.className} ${saving ? 'opacity-50' : ''}`}
      >
        {saving ? '…' : current.label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[120px]">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => handleSelect(s.value)}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                  s.value === status
                    ? 'bg-gray-50 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
