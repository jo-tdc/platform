'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'active' | 'done' | 'deleted'

const STATUSES: { value: Status; label: string; dot: string; className: string }[] = [
  { value: 'active',  label: 'Active',  dot: 'bg-yellow-400', className: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
  { value: 'done',    label: 'Done',    dot: 'bg-green-500',  className: 'bg-green-50 text-green-700 hover:bg-green-100' },
  { value: 'deleted', label: 'Deleted', dot: 'bg-red-500',    className: 'bg-red-50 text-red-700 hover:bg-red-100' },
]

type Props = {
  projectId: string
  initialStatus: string
}

export default function ProjectStatusSelector({ projectId, initialStatus }: Props) {
  const [status, setStatus] = useState<Status>((initialStatus as Status) ?? 'active')
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const current = STATUSES.find((s) => s.value === status) ?? STATUSES[0]

  async function handleSelect(next: Status) {
    if (next === status) { setOpen(false); return }
    setOpen(false)

    // Optimistic update — on change l'affichage immédiatement
    const previous = status
    setStatus(next)

    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      console.error('[ProjectStatusSelector] PUT failed', res.status, errBody)
      setStatus(previous)
      return
    }

    if (next === 'deleted') {
      router.push('/practice')
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${current.className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        {current.label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[130px]">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => handleSelect(s.value)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                  s.value === status ? 'bg-gray-50 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
