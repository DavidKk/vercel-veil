'use client'

import { Share2 } from 'feather-icons-react'
import { useRef, useState } from 'react'

import { generateShareToken } from '@/app/actions/movies-share'
import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'

export default function ShareButton() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const alertRef = useRef<AlertImperativeHandler>(null)

  const handleGenerateShare = async () => {
    setIsGenerating(true)
    try {
      const result = await generateShareToken()
      if (result.success && result.path) {
        // Construct full URL from current origin
        const fullUrl = `${window.location.origin}${result.path}`
        setShareUrl(fullUrl)
        // Copy to clipboard
        await navigator.clipboard.writeText(fullUrl)
        alertRef.current?.show('Share link copied to clipboard! Valid for 1 day.', { type: 'success' })
      } else {
        alertRef.current?.show(result.message || 'Failed to generate share link', { type: 'error' })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate share link'
      alertRef.current?.show(errorMessage, { type: 'error' })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <button
        onClick={handleGenerateShare}
        disabled={isGenerating}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        title="Generate share link (1 day validity)"
      >
        <Share2 size={16} />
        <span>{isGenerating ? 'Generating...' : 'Share'}</span>
      </button>
      {shareUrl && (
        <div className="mt-2 rounded-lg bg-green-50 p-3 text-xs text-green-800">
          <p className="font-semibold">Share link generated!</p>
          <p className="mt-1 break-all">{shareUrl}</p>
          <p className="mt-1 text-green-600">Link copied to clipboard. Valid for 1 day.</p>
        </div>
      )}
      <Alert ref={alertRef} />
    </>
  )
}
