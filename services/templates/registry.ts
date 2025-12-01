import { renderTemplate } from './render'
import { templates } from './templates'

export type { EmailTemplateDefinition } from './types'

export { templates }

export function listTemplates() {
  return templates.map((template) => {
    const { html, ...rest } = template
    void html
    return rest
  })
}

export function getTemplate(id: string) {
  return templates.find((template) => template.id === id)
}

export { renderTemplate }
