'use client'

import { HelpCircle } from 'feather-icons-react'

import { useAssistSidebar } from './AssistSidebarContext'

export interface AssistSidebarTriggerProps {
  contentKey: string
}

export function AssistSidebarTrigger({ contentKey }: AssistSidebarTriggerProps) {
  const { openSidebar } = useAssistSidebar()

  return (
    <button
      onClick={() => openSidebar(contentKey)}
      className="hidden md:flex fixed top-20 right-6 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 z-30 items-center justify-center"
      aria-label="View contextual guide"
      title="View contextual guide"
    >
      <HelpCircle size={24} />
    </button>
  )
}
