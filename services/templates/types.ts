export interface EmailTemplateDefinition {
  id: string
  name: string
  description?: string
  html: string
  variables: string[]
  defaultVariables: Record<string, string>
}
