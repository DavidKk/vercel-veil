'use client'

import { ChevronRight, RefreshCw, X } from 'feather-icons-react'
import { useEffect, useMemo, useState } from 'react'

import { previewEmailTemplate, sendTestEmail } from '@/app/actions/email'
import { useAssistSidebarContent } from '@/components/AssistSidebar'

import { TemplatePreviewPane } from './components/TemplatePreviewPane'
import { TemplateToolbar } from './components/TemplateToolbar'
import overviewDoc from './docs/overview.md?raw'
import usageDoc from './docs/usage.md?raw'
import type { TemplatePreviewerProps } from './types'

interface ParseResult {
  previewSrc: string
  jsonError: string | null
  variables: Record<string, string> | null
}

export function Prview({ templates }: TemplatePreviewerProps) {
  useAssistSidebarContent('email', [
    { key: 'overview', title: 'Overview', markdown: overviewDoc },
    { key: 'usage', title: 'Usage Guide', markdown: usageDoc },
  ])

  const [selectedId, setSelectedId] = useState(() => templates[0]?.id ?? '')
  const [jsonInput, setJsonInput] = useState(() => JSON.stringify(templates[0]?.defaultVariables ?? {}, null, 2))
  const [sending, setSending] = useState(false)
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [sendMessage, setSendMessage] = useState<string | undefined>(undefined)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const template = templates.find((item) => item.id === selectedId)
    if (template) {
      setJsonInput(JSON.stringify(template.defaultVariables, null, 2))
    }
  }, [selectedId, templates])

  const { jsonError, variables }: ParseResult = useMemo(() => {
    if (!selectedId) {
      return { previewSrc: '', jsonError: 'No template selected', variables: null }
    }

    try {
      const parsed = JSON.parse(jsonInput || '{}')
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('variables must be object')
      }

      return { previewSrc: '', jsonError: null, variables: parsed }
    } catch (error) {
      return { previewSrc: '', jsonError: (error as Error).message, variables: null }
    }
  }, [jsonInput, selectedId])

  // Update preview when variables change
  useEffect(() => {
    if (!selectedId || jsonError || !variables) {
      setPreviewHtml('')
      return
    }

    const updatePreview = async () => {
      try {
        const result = await previewEmailTemplate(selectedId, variables)
        if (result.success && result.html) {
          setPreviewHtml(result.html)
        }
      } catch (error) {
        setPreviewHtml('')
      }
    }

    updatePreview()
  }, [selectedId, variables, jsonError])

  const currentTemplate = templates.find((item) => item.id === selectedId)

  const handleSendTest = async () => {
    if (!currentTemplate) {
      setSendStatus('error')
      setSendMessage('Template not found')
      return
    }
    if (jsonError) {
      setSendStatus('error')
      setSendMessage('Please fix the variables JSON first')
      return
    }

    setSending(true)
    setSendStatus('idle')
    setSendMessage(undefined)

    try {
      const result = await sendTestEmail(selectedId, variables ?? currentTemplate.defaultVariables)
      if (result.success) {
        setSendStatus('success')
        setSendMessage('Test email sent successfully')
      } else {
        throw new Error('Failed to send email')
      }
    } catch (error) {
      setSendStatus('error')
      setSendMessage((error as Error).message)
    } finally {
      setSending(false)
    }
  }

  const previewSrc = previewHtml ? `data:text/html;charset=utf-8,${encodeURIComponent(previewHtml)}` : ''

  return (
    <>
      {/* Overlay for mobile/tablet */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 xl:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-80 flex flex-col border-r border-gray-200 bg-white overflow-hidden z-50 transition-transform duration-300 ease-in-out xl:relative xl:translate-x-0 xl:z-auto ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Email Template Editor</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRefreshKey((prev) => prev + 1)}
                disabled={!previewHtml}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                title="Refresh preview"
              >
                <RefreshCw size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="xl:hidden inline-flex items-center justify-center rounded-md p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                title="Close sidebar"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <TemplateToolbar
              templates={templates}
              selectedId={selectedId}
              onSelect={setSelectedId}
              jsonInput={jsonInput}
              onJsonChange={setJsonInput}
              jsonError={jsonError}
              currentTemplate={currentTemplate}
              onSendTest={handleSendTest}
              sending={sending}
              sendStatus={sendStatus}
              sendMessage={sendMessage}
              disableSend={!currentTemplate || Boolean(jsonError)}
            />
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto bg-white relative">
        {/* Menu toggle button for mobile/tablet - shown when sidebar is closed */}
        {!isSidebarOpen && (
          <div className="xl:hidden fixed left-0 top-1/2 -translate-y-1/2 z-30">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center justify-center rounded-r-lg bg-indigo-600 px-2 py-4 text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl"
              title="Open sidebar"
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        )}
        <TemplatePreviewPane key={refreshKey} src={previewSrc} html={previewHtml} />
      </main>
    </>
  )
}
