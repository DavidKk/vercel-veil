'use client'

import { useEffect, useMemo, useState } from 'react'

import { AssistSidebarTrigger, useAssistSidebarContent } from '@/components/AssistSidebar'

import { TemplatePreviewPane } from './components/TemplatePreviewPane'
import { TemplateToolbar } from './components/TemplateToolbar'
import overviewDoc from './docs/overview.md?raw'
import usageDoc from './docs/usage.md?raw'
import type { TemplatePreviewerProps } from './types'

function toBase64(value: string) {
  if (typeof window === 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64')
  }

  return window.btoa(unescape(encodeURIComponent(value)))
}

interface ParseResult {
  previewSrc: string
  jsonError: string | null
  variables: Record<string, string> | null
}

export function Prview({ templates }: TemplatePreviewerProps) {
  useAssistSidebarContent('templates', [
    { key: 'overview', title: 'Overview', markdown: overviewDoc },
    { key: 'usage', title: 'Usage Guide', markdown: usageDoc },
  ])

  const [selectedId, setSelectedId] = useState(() => templates[0]?.id ?? '')
  const [jsonInput, setJsonInput] = useState(() => JSON.stringify(templates[0]?.defaultVariables ?? {}, null, 2))
  const [sending, setSending] = useState(false)
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [sendMessage, setSendMessage] = useState<string | undefined>(undefined)

  useEffect(() => {
    const template = templates.find((item) => item.id === selectedId)
    if (template) {
      setJsonInput(JSON.stringify(template.defaultVariables, null, 2))
    }
  }, [selectedId, templates])

  const { previewSrc, jsonError, variables }: ParseResult = useMemo(() => {
    if (!selectedId) {
      return { previewSrc: '', jsonError: 'No template selected', variables: null }
    }

    try {
      const parsed = JSON.parse(jsonInput || '{}')
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('variables must be object')
      }

      const encoded = encodeURIComponent(toBase64(JSON.stringify(parsed)))
      return { previewSrc: `/api/templates/${selectedId}/preview?data=${encoded}`, jsonError: null, variables: parsed }
    } catch (error) {
      return { previewSrc: '', jsonError: (error as Error).message, variables: null }
    }
  }, [jsonInput, selectedId])

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
      const payload = {
        variables: variables ?? currentTemplate.defaultVariables,
      }

      const response = await fetch(`/api/templates/${selectedId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email')
      }

      setSendStatus('success')
      setSendMessage('Test email sent successfully')
    } catch (error) {
      setSendStatus('error')
      setSendMessage((error as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <aside className="flex w-full flex-col border-r border-gray-200 bg-gray-50 overflow-y-auto xl:w-80 xl:flex-shrink-0">
        <div className="flex h-full flex-col p-6">
          <div className="mb-4 flex justify-end">
            <AssistSidebarTrigger contentKey="templates" />
          </div>
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
      </aside>
      <main className="flex-1 overflow-y-auto bg-white">
        <TemplatePreviewPane src={previewSrc} />
      </main>
    </>
  )
}
