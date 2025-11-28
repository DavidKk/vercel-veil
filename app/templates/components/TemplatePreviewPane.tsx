'use client'

interface TemplatePreviewPaneProps {
  src: string
}

export function TemplatePreviewPane({ src }: TemplatePreviewPaneProps) {
  return (
    <div className="flex h-full w-full flex-col">
      {src ? (
        <iframe key={src} src={src} className="h-full w-full bg-white" title="Email preview" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-50 text-sm text-gray-500">输入有效的 JSON 以查看预览</div>
      )}
    </div>
  )
}
