'use client'

import type { TemplateSummary } from '@/app/email/types'
import SearchableSelect, { type Option } from '@/components/SearchableSelect'

interface TemplateToolbarProps {
  templates: TemplateSummary[]
  selectedId: string
  onSelect: (id: string) => void
  jsonInput: string
  onJsonChange: (value: string) => void
  jsonError: string | null
  currentTemplate?: TemplateSummary
  onSendTest: () => void
  sending: boolean
  sendStatus: 'idle' | 'success' | 'error'
  sendMessage?: string
  disableSend: boolean
}

export function TemplateToolbar({
  templates,
  selectedId,
  onSelect,
  jsonInput,
  onJsonChange,
  jsonError,
  currentTemplate,
  onSendTest,
  sending,
  sendStatus,
  sendMessage,
  disableSend,
}: TemplateToolbarProps) {
  const templateOptions: Option[] = templates.map((template) => ({
    value: template.id,
    label: template.name,
  }))

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="block text-sm font-semibold text-gray-900">Select Template</label>
        <SearchableSelect value={selectedId} options={templateOptions} onChange={(value) => onSelect(value as string)} placeholder="Select template..." size="sm" />
        {currentTemplate?.description ? <p className="text-xs text-gray-600">{currentTemplate.description}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-900">Variables JSON</label>
          {jsonError ? <span className="text-xs text-red-600">{jsonError}</span> : null}
        </div>
        <textarea
          className="h-64 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={jsonInput}
          onChange={(event) => onJsonChange(event.target.value)}
          placeholder="Enter JSON variables..."
        />
      </div>

      {currentTemplate ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-gray-900">Available Variables</p>
          <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {currentTemplate.variables.map((variable) => (
                <span key={variable} className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-700 ring-1 ring-inset ring-gray-200">
                  {variable}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-3 pt-2">
        <button
          type="button"
          disabled={sending || disableSend}
          onClick={onSendTest}
          className="w-full inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400"
        >
          {sending ? 'Sending...' : 'Send Test Email'}
        </button>

        {sendStatus === 'success' ? (
          <div className="rounded-md bg-green-50 p-3 ring-1 ring-green-200">
            <p className="text-sm text-green-800">{sendMessage || 'Email sent successfully, please check your inbox'}</p>
          </div>
        ) : null}
        {sendStatus === 'error' ? (
          <div className="rounded-md bg-red-50 p-3 ring-1 ring-red-200">
            <p className="text-sm text-red-800">{sendMessage || 'Failed to send email, please try again later'}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
