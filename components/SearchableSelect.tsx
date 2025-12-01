'use client'

import { ChevronDown } from 'feather-icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useIsMobile } from '@/hooks/useMobile'
import { fuzzyMatch } from '@/utils/fuzzyMatch'

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export interface Option {
  value: any
  label: string
}

export interface SearchableSelectProps {
  className?: string
  value?: any
  placeholder?: string
  options?: Option[]
  onChange?: (value: any) => void
  clearable?: boolean
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  searchable?: boolean
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
  tabIndex?: number
}

export default function SearchableSelect(props: SearchableSelectProps) {
  const { className, options = [], value, placeholder, onChange, clearable = true, size = 'sm', searchable = true, enterKeyHint = 'done', tabIndex } = props

  const [selectedOption, setSelectedOption] = useState(value)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const selectRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  // Filter options based on search term using fuzzy matching with useMemo
  const filteredOptions = useMemo(() => {
    if (searchTerm) {
      return options
        .map((option) => ({
          option,
          matchResult: fuzzyMatch(option.label, searchTerm),
        }))
        .filter(({ matchResult }) => matchResult.matched)
        .sort((a, b) => b.matchResult.score - a.matchResult.score)
        .map(({ option }) => option)
    } else {
      return options
    }
  }, [searchTerm, options])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isMobile) {
      return
    }

    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, isMobile])

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex >= 0 && isOpen) {
      const optionElements = selectRef.current?.querySelectorAll('[data-option-index]')
      if (optionElements && optionElements[activeIndex]) {
        optionElements[activeIndex].scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex, isOpen])

  const handleOptionSelect = (optionValue: any) => {
    setSelectedOption(optionValue)
    onChange && onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
    setActiveIndex(-1)

    // Move focus to next element if enterKeyHint is 'next' or 'done'
    if (enterKeyHint === 'next' || enterKeyHint === 'done') {
      if (tabIndex !== undefined) {
        const nextElement = document.querySelector(`input[tabindex="${tabIndex + 1}"]`) as HTMLElement | null
        if (nextElement) {
          nextElement.focus()
        }
      }
    }
  }

  const clearSelection = () => {
    setSelectedOption('')
    onChange && onChange(undefined)
    setSearchTerm('')
  }

  // Update selected option when value prop changes
  useEffect(() => {
    setSelectedOption(value)
  }, [value])

  // Find the label for the selected value
  const selectedLabel = options.find((option) => option.value === selectedOption)?.label || ''

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(true)
        setActiveIndex(-1)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (filteredOptions.length > 0) {
          setActiveIndex((prevIndex) => (prevIndex < filteredOptions.length - 1 ? prevIndex + 1 : prevIndex))
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (filteredOptions.length > 0) {
          setActiveIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : -1))
        }
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          handleOptionSelect(filteredOptions[activeIndex].value)
        } else if (filteredOptions.length > 0) {
          handleOptionSelect(filteredOptions[0].value)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  return (
    <div
      ref={selectRef}
      className={cn('relative', 'w-full', 'flex', 'flex-nowrap', className, size === 'sm' ? 'rounded' : size === 'md' ? 'rounded-md' : 'rounded-lg')}
      onKeyDown={handleKeyDown}
    >
      {/* Display selected value or placeholder */}
      <div
        className={cn(
          'w-full',
          'pl-4',
          'pr-8',
          'appearance-none',
          'box-border',
          'bg-white',
          'border',
          'border-gray-300',
          'flex',
          'items-center',
          'cursor-pointer',
          'rounded-md',
          'h-10',
          selectedOption ? 'text-gray-900' : 'text-gray-400',
          size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'
        )}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={tabIndex}
      >
        {selectedOption ? <span className="truncate">{selectedLabel}</span> : <span className="text-gray-400">{placeholder || 'Select'}</span>}
      </div>

      {/* Dropdown arrow and clear button */}
      <div
        className={cn(
          'flex',
          'items-center',
          'justify-center',
          'absolute',
          'right-2',
          'top-1/2',
          'transform',
          '-translate-y-1/2',
          size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'
        )}
      >
        {!!selectedOption && clearable ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              clearSelection()
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            &#10005;
          </button>
        ) : (
          <div className="pointer-events-none">
            <ChevronDown size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} className={cn('text-gray-400', isOpen ? 'rotate-180' : '', 'transition-transform')} />
          </div>
        )}
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute',
            'top-full',
            'left-0',
            'right-0',
            'mt-1',
            'bg-white',
            'border',
            'border-gray-300',
            'shadow-lg',
            size === 'sm' ? 'rounded' : size === 'md' ? 'rounded-md' : 'rounded-lg',
            'z-10'
          )}
        >
          {/* Search input */}
          {searchable && (
            <div className="p-2">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className={cn(
                  'w-full',
                  'px-3',
                  'focus:outline-none',
                  'focus:ring-1',
                  'focus:ring-blue-500',
                  'bg-white',
                  'text-gray-900',
                  'rounded-md',
                  'border',
                  'border-gray-300',
                  size === 'sm' ? 'text-sm py-1' : size === 'md' ? 'text-base py-2' : 'text-lg py-2'
                )}
                onClick={(e) => e.stopPropagation()}
                enterKeyHint={enterKeyHint}
              />
            </div>
          )}

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  data-option-index={index}
                  className={cn(
                    'px-4',
                    'cursor-pointer',
                    'hover:bg-gray-100',
                    'flex',
                    'items-center',
                    'border-0',
                    'box-border',
                    'w-full',
                    'text-gray-900',
                    index === activeIndex ? 'bg-gray-100' : '',
                    size === 'sm' ? 'py-1' : size === 'md' ? 'py-2' : 'py-3'
                  )}
                  onClick={() => handleOptionSelect(option.value)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className={cn('px-4', 'text-gray-400', 'flex', 'items-center', 'border-0', 'box-border', 'w-full', size === 'sm' ? 'py-1' : size === 'md' ? 'py-2' : 'py-3')}>
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
