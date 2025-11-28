import { parseDocument } from 'htmlparser2'

export function nodeText(node: any): string {
  if (!node) return ''
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (typeof node.data === 'string') return node.data
  if (node.children && node.children.length) return node.children.map(nodeText).join('')
  return ''
}

export function parseNumber(value?: string | null): number | null {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  if (s === '' || s === '-') return null
  const cleaned = s.replace(/[,\s]/g, '').replace(/[^0-9.\-]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export function parsePercent(value?: string | null): number | null {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  if (s === '' || s === '-') return null
  return parseNumber(s.replace('%', ''))
}

export function ensureDoc(input: string | any): any {
  if ((input as any).type && (input as any).childNodes !== undefined) {
    return input
  }
  return parseDocument(String(input))
}
