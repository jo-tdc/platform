'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BriefForm, { type BriefFormData } from '@/components/practice/BriefForm'
import DocumentBriefUploader from '@/components/practice/DocumentBriefUploader'
import BriefSummaryReview from '@/components/practice/BriefSummaryReview'
import Link from 'next/link'

type Step = 'form' | 'review'
type Mode = 'manual' | 'documents'

export default function NewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [mode, setMode] = useState<Mode>('manual')
  const [formData, setFormData] = useState<BriefFormData | null>(null)
  const [docName, setDocName] = useState<string | null>(null)
  const [briefSummary, setBriefSummary] = useState<string | null>(null)
  const [generatingBrief, setGeneratingBrief] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function buildBriefText(data: BriefFormData): string {
    return [
      `Nom du projet : ${data.name}`,
      `\nProblème / Opportunité :\n${data.problem}`,
      data.targetUsers ? `\nUtilisateurs cibles :\n${data.targetUsers}` : null,
      data.goals ? `\nObjectifs :\n${data.goals}` : null,
      data.constraints ? `\nContraintes & contexte :\n${data.constraints}` : null,
      data.scope ? `\nPérimètre :\n${data.scope}` : null,
    ]
      .filter(Boolean)
      .join('\n')
  }

  async function handleFormSubmit(data: BriefFormData) {
    setFormData(data)
    setGeneratingBrief(true)
    setError(null)

    const response = await fetch('/api/practice/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief_text: buildBriefText(data) }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erreur de génération' }))
      setError(err.error)
      setGeneratingBrief(false)
      return
    }

    const { brief_summary } = await response.json()
    setBriefSummary(brief_summary)
    setStep('review')
    setGeneratingBrief(false)
  }

  async function handleDocumentSubmit(name: string, files: File[]) {
    setDocName(name)
    setGeneratingBrief(true)
    setError(null)

    const fd = new FormData()
    fd.append('name', name)
    for (const file of files) fd.append('files', file)

    const response = await fetch('/api/practice/brief-from-docs', {
      method: 'POST',
      body: fd,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erreur de génération' }))
      setError(err.error)
      setGeneratingBrief(false)
      return
    }

    const { brief_summary } = await response.json()
    setBriefSummary(brief_summary)
    setStep('review')
    setGeneratingBrief(false)
  }

  async function handleRegenerate() {
    if (mode === 'manual' && formData) {
      await handleFormSubmit(formData)
    }
    // Pour le mode documents, on revient à l'étape form pour re-uploader
    else {
      setStep('form')
    }
  }

  async function handleConfirm() {
    if (!briefSummary) return
    setCreatingProject(true)
    setError(null)

    const name = mode === 'manual' ? formData?.name : docName
    const briefText = mode === 'manual' && formData ? buildBriefText(formData) : briefSummary

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, brief_text: briefText, brief_summary: briefSummary }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erreur de création' }))
      setError(err.error)
      setCreatingProject(false)
      return
    }

    const { project } = await response.json()
    router.push(`/practice/${project.id}`)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/practice" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Mes projets
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-3">Nouveau projet</h1>
          <p className="text-sm text-gray-500 mt-1">
            Décris ton projet pour que l'IA génère un brief structuré.
          </p>
        </div>

        {/* Étapes */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`flex items-center gap-2 text-sm ${step === 'form' ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'form' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
              1
            </span>
            Informations
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className={`flex items-center gap-2 text-sm ${step === 'review' ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'review' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
              2
            </span>
            Validation du brief
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 'form' && (
          <>
            {/* Toggle mode */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === 'manual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Saisie manuelle
              </button>
              <button
                type="button"
                onClick={() => setMode('documents')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === 'documents'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Uploader des documents
              </button>
            </div>

            {mode === 'manual' ? (
              <BriefForm onSubmit={handleFormSubmit} loading={generatingBrief} />
            ) : (
              <DocumentBriefUploader onSubmit={handleDocumentSubmit} loading={generatingBrief} />
            )}
          </>
        )}

        {step === 'review' && briefSummary && (
          <BriefSummaryReview
            summary={briefSummary}
            onConfirm={handleConfirm}
            onRegenerate={handleRegenerate}
            loading={generatingBrief || creatingProject}
          />
        )}
      </div>
    </div>
  )
}
