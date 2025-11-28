'use client'

import { forwardRef } from 'react'

export interface SwitchProps {
  /**
   * Whether the switch is checked
   */
  checked: boolean
  /**
   * Callback when the switch state changes
   */
  onChange: (checked: boolean) => void
  /**
   * Whether the switch is disabled
   */
  disabled?: boolean
  /**
   * Label text to display next to the switch
   */
  label?: string
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Size of the switch
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Color variant
   */
  variant?: 'primary' | 'secondary' | 'success' | 'danger'
}

const sizeClasses = {
  sm: 'h-4 w-7',
  md: 'h-5 w-9',
  lg: 'h-6 w-11',
}

const thumbSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

const translateClasses = {
  sm: 'translate-x-3',
  md: 'translate-x-4',
  lg: 'translate-x-5',
}

const variantClasses = {
  primary: 'bg-indigo-600 checked:bg-indigo-600',
  secondary: 'bg-gray-600 checked:bg-gray-600',
  success: 'bg-green-600 checked:bg-green-600',
  danger: 'bg-red-600 checked:bg-red-600',
}

/**
 * Switch component for toggling boolean values
 *
 * @example
 * ```tsx
 * <Switch
 *   checked={isEnabled}
 *   onChange={setIsEnabled}
 *   label="Enable notifications"
 * />
 * ```
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(props, ref) {
  const { checked, onChange, disabled = false, label, className = '', size = 'md', variant = 'primary' } = props

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!disabled) {
        onChange(!checked)
      }
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || 'Toggle switch'}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${sizeClasses[size]}
          ${checked ? variantClasses[variant] : 'bg-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:ring-indigo-500
        `}
      >
        <span
          className={`
            inline-block rounded-full bg-white transform transition-transform duration-200 ease-in-out
            ${thumbSizeClasses[size]}
            ${checked ? translateClasses[size] : 'translate-x-0.5'}
          `}
        />
      </button>
      {label && (
        <label onClick={disabled ? undefined : handleClick} className={`text-sm text-gray-700 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
          {label}
        </label>
      )}
    </div>
  )
})
