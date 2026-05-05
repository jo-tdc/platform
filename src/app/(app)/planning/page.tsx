'use client'

import { useState, useEffect } from 'react'

type Mentor = { id: string; first_name: string; job_title: string | null; photo_url: string | null }
type Block = {
  id: string
  date: string
  period: 'morning' | 'afternoon'
  type: 'theory' | 'practice'
  title: string
  mentors: Mentor | null
}
type Schedule = { id: string; starts_at: string; ends_at: string }

const DAYS_FR = ['LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.']
const PERIODS: { key: 'morning' | 'afternoon'; label: string }[] = [
  { key: 'morning', label: 'Matinée' },
  { key: 'afternoon', label: 'Après-midi' },
]

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function PlanningPage() {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()))

  useEffect(() => {
    fetch('/api/planning')
      .then((r) => r.json())
      .then(({ schedule: s, blocks: b }) => {
        setSchedule(s)
        setBlocks(b ?? [])
        if (s) {
          // Positionner sur la semaine courante si dans la plage, sinon première semaine
          const now = getMonday(new Date())
          const start = new Date(s.starts_at + 'T00:00:00')
          const end = new Date(s.ends_at + 'T23:59:59')
          if (now >= start && now <= end) {
            setWeekStart(now)
          } else {
            setWeekStart(getMonday(start))
          }
        }
        setLoading(false)
      })
  }, [])

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
  const scheduleStart = schedule ? new Date(schedule.starts_at + 'T00:00:00') : null
  const scheduleEnd = schedule ? new Date(schedule.ends_at + 'T23:59:59') : null

  function getBlock(date: Date, period: 'morning' | 'afternoon'): Block | null {
    const ds = toISODate(date)
    return blocks.find((b) => b.date === ds && b.period === period) ?? null
  }

  function isInRange(date: Date): boolean {
    if (!scheduleStart || !scheduleEnd) return false
    return date >= scheduleStart && date <= scheduleEnd
  }

  const canGoPrev = scheduleStart ? addDays(weekStart, -1) >= scheduleStart : false
  const canGoNext = scheduleEnd ? addDays(weekStart, 7) <= scheduleEnd : false

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-400">Chargement…</p>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">Aucun planning disponible</p>
          <p className="text-xs text-gray-400 mt-1">Le planning de ta formation n&apos;a pas encore été publié.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Planning</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(schedule.starts_at + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' — '}
              {new Date(schedule.ends_at + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Navigation semaines */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              disabled={!canGoPrev}
              className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span className="text-xs font-medium text-gray-700 min-w-[130px] text-center">
              {formatDay(weekDays[0])} — {formatDay(weekDays[4])}
            </span>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              disabled={!canGoNext}
              className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>

        {/* Calendrier */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Header jours */}
          <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-gray-100">
            <div />
            {weekDays.map((day, i) => {
              const isToday = toISODate(day) === toISODate(new Date())
              return (
                <div key={i} className="p-3 text-center border-l border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{DAYS_FR[i]}</p>
                  <p className={`text-2xl font-semibold mt-0.5 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {day.getDate()}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Lignes demi-journées */}
          {PERIODS.map((period) => (
            <div key={period.key} className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-gray-100 last:border-0 min-h-[120px]">
              <div className="p-3 border-r border-gray-100 flex items-center">
                <span className="text-xs font-medium text-gray-400">{period.label}</span>
              </div>
              {weekDays.map((day, i) => {
                const inRange = isInRange(day)
                const block = getBlock(day, period.key)
                return (
                  <div
                    key={i}
                    className={`border-l border-gray-100 p-2.5 ${!inRange ? 'bg-gray-50/60' : ''}`}
                  >
                    {block ? (
                      <div className={`h-full p-3 rounded-xl border ${block.type === 'theory' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${block.type === 'theory' ? 'text-blue-500' : 'text-green-600'}`}>
                          {block.type === 'theory' ? 'Théorie' : 'Pratique'}
                        </span>
                        <p className="text-sm font-medium text-gray-900 mt-1 leading-snug">{block.title}</p>
                        {block.mentors && (
                          <div className="flex items-center gap-2 mt-3">
                            {block.mentors.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={block.mentors.photo_url}
                                alt={block.mentors.first_name}
                                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-500 flex-shrink-0">
                                {block.mentors.first_name[0]}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-gray-700">{block.mentors.first_name}</p>
                              {block.mentors.job_title && (
                                <p className="text-[10px] text-gray-400">{block.mentors.job_title}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
