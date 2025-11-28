'use client'

import { useEffect } from 'react'

import type { AssistSidebarSection } from './AssistSidebarContext'
import { useAssistSidebar } from './AssistSidebarContext'
import { markdownToHtml } from './markdownToHtml'

export interface AssistSidebarDoc {
  key: string
  title: string
  markdown: string
}

/**
 * Hook to register assist sidebar sections for the current page
 * @param moduleKey - Unique key for the module (e.g., 'webauthn', 'totp')
 * @param docs - Array of documents with title and markdown content
 */
export function useAssistSidebarContent(moduleKey: string, docs: AssistSidebarDoc[]) {
  const { registerSections } = useAssistSidebar()

  useEffect(() => {
    const sections: AssistSidebarSection[] = docs.map((doc) => ({
      key: doc.key,
      title: doc.title,
      content: markdownToHtml(doc.markdown),
    }))
    registerSections(moduleKey, sections)
  }, [moduleKey, docs, registerSections])
}
