'use client'

import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useState } from 'react'

export interface AssistSidebarSection {
  key: string
  title: string
  content: string
}

interface AssistSidebarContextType {
  isOpen: boolean
  sections: AssistSidebarSection[]
  activeSection: string | null
  openSidebar: (moduleKey: string) => void
  closeSidebar: () => void
  setActiveSection: (sectionKey: string) => void
  registerSections: (moduleKey: string, sections: AssistSidebarSection[]) => void
}

const AssistSidebarContext = createContext<AssistSidebarContextType | undefined>(undefined)

export function AssistSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [sectionsRegistry, setSectionsRegistry] = useState<Record<string, AssistSidebarSection[]>>({})
  const [currentModule, setCurrentModule] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const registerSections = useCallback((moduleKey: string, sections: AssistSidebarSection[]) => {
    setSectionsRegistry((prev) => {
      // Only update if sections changed
      const prevSections = prev[moduleKey]
      if (prevSections && JSON.stringify(prevSections) === JSON.stringify(sections)) {
        return prev
      }
      return { ...prev, [moduleKey]: sections }
    })
  }, [])

  const openSidebar = useCallback((moduleKey: string) => {
    setSectionsRegistry((registry) => {
      const sections = registry[moduleKey]
      if (sections && sections.length > 0) {
        setCurrentModule(moduleKey)
        setActiveSection(sections[0].key)
        setIsOpen(true)
      }
      return registry
    })
  }, [])

  const closeSidebar = useCallback(() => {
    setIsOpen(false)
    // Delay clearing content until animation completes
    setTimeout(() => {
      setCurrentModule(null)
      setActiveSection(null)
    }, 300)
  }, [])

  const handleSetActiveSection = useCallback((sectionKey: string) => {
    setActiveSection(sectionKey)
  }, [])

  const sections = currentModule ? sectionsRegistry[currentModule] || [] : []

  return (
    <AssistSidebarContext.Provider
      value={{
        isOpen,
        sections,
        activeSection,
        openSidebar,
        closeSidebar,
        setActiveSection: handleSetActiveSection,
        registerSections,
      }}
    >
      {children}
    </AssistSidebarContext.Provider>
  )
}

export function useAssistSidebar() {
  const context = useContext(AssistSidebarContext)
  if (context === undefined) {
    throw new Error('useAssistSidebar must be used within an AssistSidebarProvider')
  }
  return context
}
