'use client'

import { Copy } from 'feather-icons-react'
import { useEffect, useState } from 'react'

import { generateShareToken } from '@/app/actions/movies-share'
import Modal from '@/components/Modal'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setIsCopied(false)
    try {
      const result = await generateShareToken()
      if (result.success && result.path) {
        // Construct full URL from current origin
        const fullUrl = `${window.location.origin}${result.path}`
        setShareUrl(fullUrl)
      }
    } catch (error) {
      // Failed to generate share token
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to generate share token:', error)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return

    try {
      // Check if Clipboard API is available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } else {
        // Fallback: use execCommand for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = shareUrl
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        textarea.setSelectionRange(0, 99999) // For mobile devices

        try {
          const successful = document.execCommand('copy')
          if (successful) {
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
          } else {
            throw new Error('execCommand copy failed')
          }
        } finally {
          document.body.removeChild(textarea)
        }
      }
    } catch (error) {
      // Failed to copy
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to copy:', error)
      }
      // Show error message or fallback UI
      alert('Failed to copy. Please manually copy the URL.')
    }
  }

  // Generate share URL when modal opens
  useEffect(() => {
    if (isOpen && !shareUrl && !isGenerating) {
      handleGenerate()
    }
  }, [isOpen, shareUrl, isGenerating])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShareUrl('')
      setIsCopied(false)
      setIsGenerating(false)
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Movie List">
      <div className="relative">
        {/* Loading bar - absolute positioned at top, below header, spans full width, doesn't affect layout */}
        {isGenerating && (
          <div className="absolute -top-4 -left-6 -right-6 h-0.5 z-10 shadow-lg shadow-indigo-600/50">
            <div className="h-full bg-indigo-600 animate-pulse" style={{ width: '100%' }} />
          </div>
        )}
        <div className="space-y-5">
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              Share this link with others to allow them to add movies to favorites. The link expires in <span className="font-semibold">1 day</span>.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="share-url" className="block text-sm font-semibold text-gray-700">
                Share URL
              </label>
              <div className="relative">
                <textarea
                  id="share-url"
                  value={shareUrl}
                  readOnly
                  disabled={isGenerating}
                  rows={4}
                  className={`w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900 outline-none resize-none transition-all ${
                    isGenerating ? 'cursor-not-allowed opacity-50' : shareUrl ? 'cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' : ''
                  }`}
                  onClick={(e) => {
                    if (isGenerating || !shareUrl) return
                    // Select all text when clicked
                    e.preventDefault()
                    const target = e.currentTarget
                    target.focus()
                    // Use setTimeout to ensure focus happens before selection
                    setTimeout(() => {
                      target.select()
                      // For mobile devices
                      target.setSelectionRange(0, target.value.length)
                    }, 0)
                  }}
                  onFocus={(e) => {
                    if (isGenerating || !shareUrl) return
                    // Select all on focus
                    const target = e.currentTarget
                    setTimeout(() => {
                      target.select()
                      target.setSelectionRange(0, target.value.length)
                    }, 0)
                  }}
                  placeholder={isGenerating ? 'Generating share link...' : 'Share URL will appear here'}
                />
                {isGenerating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 rounded-lg pointer-events-none">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                      <span>Generating...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleCopy}
              disabled={isGenerating || !shareUrl}
              className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                isGenerating || !shareUrl
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isCopied
                    ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/30'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
              }`}
            >
              <Copy size={18} />
              <span>{isCopied ? 'Copied to Clipboard!' : 'Copy URL'}</span>
            </button>
            {/* Always render this div to maintain layout height */}
            <div className="flex items-center gap-2 text-xs text-gray-500 min-h-[20px]">
              {shareUrl && (
                <>
                  <div className="h-1 w-1 rounded-full bg-gray-400"></div>
                  <span>Link expires in 24 hours</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
