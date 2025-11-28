export interface TemplateSummary {
  id: string
  name: string
  description?: string
  defaultVariables: Record<string, string>
  variables: string[]
}

export interface TemplatePreviewerProps {
  templates: TemplateSummary[]
}
