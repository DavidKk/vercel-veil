/**
 * Process {{#if key}}...{{/if}} conditionals
 * Supports: {{#if key}}...{{/if}} and {{#if key}}...{{else}}...{{/if}}
 */
function processConditionals(html: string, context: Record<string, any>): string {
  // Handle {{#if key}}...{{else}}...{{/if}} with else
  const ifElseRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g
  html = html.replace(ifElseRegex, (match, key: string, trueContent: string, falseContent: string) => {
    const value = context[key]
    const isTruthy = value !== undefined && value !== null && value !== '' && value !== false && value !== 0
    return isTruthy ? trueContent : falseContent
  })

  // Handle {{#if key}}...{{/if}} without else
  const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g
  html = html.replace(ifRegex, (match, key: string, content: string) => {
    const value = context[key]
    const isTruthy = value !== undefined && value !== null && value !== '' && value !== false && value !== 0
    return isTruthy ? content : ''
  })

  return html
}

export function renderTemplate(html: string, variables: Record<string, string>) {
  let result = html

  // Handle {{#each movies}}...{{/each}} loop syntax
  const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g
  result = result.replace(eachRegex, (match, arrayKey, template) => {
    try {
      const arrayData = JSON.parse(variables[arrayKey] || '[]')
      if (!Array.isArray(arrayData)) {
        return ''
      }
      return arrayData
        .map((item: any) => {
          let itemHtml = template

          // Handle nested {{#each}} loops within item (e.g., genres array)
          const nestedEachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g
          itemHtml = itemHtml.replace(nestedEachRegex, (match: string, arrayKey: string, nestedTemplate: string) => {
            const nestedArray = item[arrayKey]
            if (!Array.isArray(nestedArray) || nestedArray.length === 0) {
              return ''
            }
            return nestedArray
              .map((nestedItem: any) => {
                let nestedHtml = nestedTemplate
                // Handle {{this}} in nested loops
                nestedHtml = nestedHtml.replace(/\{\{this\}\}/g, () => {
                  return String(nestedItem).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
                })
                // Handle {{!this}} in nested loops (unescaped)
                nestedHtml = nestedHtml.replace(/\{\{!this\}\}/g, () => {
                  return String(nestedItem)
                })
                return nestedHtml
              })
              .join('')
          })

          // Handle {{#if key}}...{{/if}} conditionals within loop
          itemHtml = processConditionals(itemHtml, item)

          // Replace item properties in the template
          // Use {{!key}} for HTML content that should not be escaped
          itemHtml = itemHtml.replace(/\{\{!(\w+)\}\}/g, (_: string, key: string) => {
            const value = item[key]
            return value !== undefined && value !== null ? String(value) : ''
          })
          // Regular {{key}} for text content (escape HTML)
          itemHtml = itemHtml.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
            const value = item[key]
            if (value === undefined || value === null) {
              return ''
            }
            // Escape HTML for safety
            return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
          })
          return itemHtml
        })
        .join('')
    } catch {
      return ''
    }
  })

  // Handle {{#if key}}...{{/if}} conditionals for top-level variables
  result = processConditionals(result, variables)

  // Handle regular variable replacement
  result = result.replace(/{{\s*([\w.]+)\s*}}/g, (_, key: string) => {
    const value = variables[key]
    return value ?? ''
  })

  // Remove empty divs that contain only whitespace (for releaseDetails, indexerDetails, message)
  // This handles cases where variables are empty and would show empty boxes
  result = result.replace(/<div class="stack">\s*<\/div>/g, '')
  result = result.replace(/<div class="message">\s*<\/div>/g, '')

  // Remove empty section divs (which contain empty stack divs)
  result = result.replace(/<div class="section">\s*<h2>.*?<\/h2>\s*<\/div>/g, '')

  return result
}
