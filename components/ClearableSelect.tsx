'use client'

import { ChevronDown, X } from 'feather-icons-react'
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
  dark?: boolean
  media?: boolean
}

export default function ClearableSelect(props: ClearableSelectProps) {
  const { options = [], value, placeholder, onChange, clearable = true, required, dark = false, media = false } = props
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
        className={`h-9 w-full pl-3.5 pr-9 appearance-none border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
          media
            ? `border-white/20 bg-white/5 backdrop-blur-sm hover:border-white/30 ${selectedOption ? 'text-white' : 'text-gray-300'}`
            : dark
              ? `border-white/20 bg-white/5 backdrop-blur-sm hover:border-white/30 ${selectedOption ? 'text-white' : 'text-gray-300'}`
              : `border-gray-300 bg-white hover:border-gray-400 ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`
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
            className={`pointer-events-auto flex items-center justify-center h-5 w-5 rounded-full transition-colors duration-200 ${
              media || dark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            type="button"
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={16} className={media || dark ? 'text-gray-300' : 'text-gray-400'} />
        )}
      </div>
    </div>
  )
}
