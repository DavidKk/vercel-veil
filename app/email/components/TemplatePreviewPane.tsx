'use client'

interface TemplatePreviewPaneProps {
  src: string
  html?: string
}

export function TemplatePreviewPane({ src, html }: TemplatePreviewPaneProps) {
  return (
    <div className="flex h-full w-full flex-col">
      {src && html ? (
        <iframe key={src} srcDoc={html} className="h-full w-full bg-white" title="Email preview" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-50 text-sm text-gray-500">Enter valid JSON to view preview</div>
      )}
    </div>
  )
}
