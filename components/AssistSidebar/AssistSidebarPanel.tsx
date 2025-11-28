'use client'

import { X } from 'feather-icons-react'

import { useAssistSidebar } from './AssistSidebarContext'

export function AssistSidebarPanel() {
  const { isOpen, sections, activeSection, setActiveSection, closeSidebar } = useAssistSidebar()

  const currentContent = sections.find((s) => s.key === activeSection)?.content || ''

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300" onClick={closeSidebar} />}

      {/* Sidebar drawer */}
      <aside
        className={`fixed left-0 top-0 w-full md:w-[900px] lg:w-[1100px] h-screen bg-white border-r border-gray-200 z-50 transition-transform duration-300 ease-in-out flex ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation */}
        <nav className="w-48 border-r border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="p-4">
            <ul className="space-y-1">
              {sections.map((section) => (
                <li key={section.key}>
                  <button
                    onClick={() => setActiveSection(section.key)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      activeSection === section.key ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Content area */}
        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Close button */}
          <button
            onClick={closeSidebar}
            className="absolute top-3 right-8 p-1 hover:bg-red-50 hover:text-red-400 rounded transition-all duration-200 hover:scale-110 text-gray-500 z-10"
            aria-label="Close assist sidebar"
          >
            <X size={20} className="transition-transform" />
          </button>

          <div className="h-full overflow-y-auto overflow-x-hidden">
            <div className="p-5 pr-12 min-w-0">
              {currentContent && (
                <div className="sidebar-content break-words">
                  <div dangerouslySetInnerHTML={{ __html: currentContent }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
