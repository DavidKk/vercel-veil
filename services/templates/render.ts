import Handlebars from 'handlebars'

/**
 * Register custom Handlebars helpers
 */
function registerHelpers() {
  // Helper to check if a number is greater than 1 (for pluralization)
  Handlebars.registerHelper('gt', (a: any, b: any) => {
    return Number(a) > Number(b)
  })

  // Helper to check if a value is truthy (for isPlural)
  Handlebars.registerHelper('isPlural', (value: any) => {
    return value && value !== '' && value !== '0' && value !== 0 && value !== false
  })
}

// Register helpers once when module loads
registerHelpers()

/**
 * Render template using Handlebars
 * @param html Template HTML string
 * @param variables Template variables (JSON strings will be parsed automatically)
 * @returns Rendered HTML string
 */
export function renderTemplate(html: string, variables: Record<string, string>) {
  // Parse JSON variables and create context object
  const context: Record<string, any> = { ...variables }
  for (const [key, value] of Object.entries(variables)) {
    if (key.endsWith('JSON')) {
      try {
        context[key] = JSON.parse(value)
      } catch {
        // If parsing fails, keep as string
        context[key] = value
      }
    }
  }

  // Compile template
  const template = Handlebars.compile(html)

  // Render template with context
  let result = template(context)

  // Remove empty divs that contain only whitespace (for releaseDetails, indexerDetails, message)
  // This handles cases where variables are empty and would show empty boxes
  result = result.replace(/<div class="stack">\s*<\/div>/g, '')
  result = result.replace(/<div class="message">\s*<\/div>/g, '')

  // Remove empty section divs (which contain empty stack divs)
  result = result.replace(/<div class="section">\s*<h2>.*?<\/h2>\s*<\/div>/g, '')

  return result
}
