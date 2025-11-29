'use client'

import { useEffect, useState } from 'react'

interface Option {
  value: any
  label: string
}

export interface ClearableSelectProps {
  value?: any
  placeholder?: string
  options?: Option[]
  onChange?: (value: any) => void
  clearable?: boolean
  required?: boolean
}

export default function ClearableSelect(props: ClearableSelectProps) {
  const { options = [], value, placeholder, onChange, clearable = true, required } = props
  const [selectedOption, setSelectedOption] = useState(value)

  const handleOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    setSelectedOption(value)
    onChange && onChange(value)
  }

  const clearSelection = () => {
    setSelectedOption('')
    onChange && onChange(undefined)
  }

  useEffect(() => {
    setSelectedOption(value)
  }, [value])

  return (
    <div className="relative w-auto text-sm flex flex-nowarp shrink-0">
      <select
        required={required}
        value={selectedOption}
        onChange={handleOptionChange}
        suppressHydrationWarning
        className={`h-9 w-full pl-3.5 pr-9 appearance-none border border-gray-300 rounded-lg bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 ${
          selectedOption ? 'text-gray-900' : 'text-gray-500'
        }`}
      >
        {!selectedOption && <option value="">{placeholder || 'Select'}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={!option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="flex h-5 w-5 items-center justify-center absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
        {!!selectedOption && clearable ? (
          <button
            onClick={clearSelection}
            className="pointer-events-auto flex items-center justify-center h-5 w-5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
            type="button"
            aria-label="Clear selection"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </div>
  )
}
