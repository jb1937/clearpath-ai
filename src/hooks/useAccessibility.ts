/**
 * Accessibility Hook
 * Provides WCAG compliance utilities and accessibility features
 */

import { useEffect, useState, useCallback } from 'react'

export interface AccessibilityPreferences {
  reducedMotion: boolean
  highContrast: boolean
  largeText: boolean
  screenReader: boolean
  keyboardNavigation: boolean
}

export interface AccessibilityState {
  preferences: AccessibilityPreferences
  announcements: string[]
  focusVisible: boolean
  skipLinks: boolean
}

export const useAccessibility = () => {
  const [state, setState] = useState<AccessibilityState>({
    preferences: {
      reducedMotion: false,
      highContrast: false,
      largeText: false,
      screenReader: false,
      keyboardNavigation: false
    },
    announcements: [],
    focusVisible: false,
    skipLinks: true
  })

  // Detect user preferences
  useEffect(() => {
    const detectPreferences = () => {
      const preferences: AccessibilityPreferences = {
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        highContrast: window.matchMedia('(prefers-contrast: high)').matches,
        largeText: window.matchMedia('(min-resolution: 2dppx)').matches,
        screenReader: detectScreenReader(),
        keyboardNavigation: false // Will be detected on first tab key
      }

      setState(prev => ({ ...prev, preferences }))
    }

    detectPreferences()

    // Listen for preference changes
    const mediaQueries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(min-resolution: 2dppx)')
    ]

    mediaQueries.forEach(mq => {
      mq.addEventListener('change', detectPreferences)
    })

    return () => {
      mediaQueries.forEach(mq => {
        mq.removeEventListener('change', detectPreferences)
      })
    }
  }, [])

  // Detect screen reader usage
  const detectScreenReader = (): boolean => {
    // Check for common screen reader indicators
    const indicators = [
      'speechSynthesis' in window,
      navigator.userAgent.includes('NVDA'),
      navigator.userAgent.includes('JAWS'),
      navigator.userAgent.includes('VoiceOver'),
      document.querySelector('[aria-live]') !== null
    ]

    return indicators.some(Boolean)
  }

  // Keyboard navigation detection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setState(prev => ({
          ...prev,
          preferences: { ...prev.preferences, keyboardNavigation: true },
          focusVisible: true
        }))
      }
    }

    const handleMouseDown = () => {
      setState(prev => ({ ...prev, focusVisible: false }))
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // Announce to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setState(prev => ({
      ...prev,
      announcements: [...prev.announcements, message]
    }))

    // Create live region for announcement
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', priority)
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    liveRegion.textContent = message

    document.body.appendChild(liveRegion)

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion)
    }, 1000)
  }, [])

  // Focus management
  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      element.focus()
      announce(`Focused on ${element.getAttribute('aria-label') || element.textContent || 'element'}`)
    }
  }, [announce])

  // Skip to main content
  const skipToMain = useCallback(() => {
    const main = document.querySelector('main') || document.querySelector('[role="main"]')
    if (main) {
      (main as HTMLElement).focus()
      announce('Skipped to main content')
    }
  }, [announce])

  // Apply accessibility preferences to document
  useEffect(() => {
    const { preferences } = state

    // Apply reduced motion
    if (preferences.reducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms')
      document.documentElement.style.setProperty('--transition-duration', '0.01ms')
    }

    // Apply high contrast
    if (preferences.highContrast) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }

    // Apply large text
    if (preferences.largeText) {
      document.documentElement.classList.add('large-text')
    } else {
      document.documentElement.classList.remove('large-text')
    }

    // Apply focus visible styles
    if (state.focusVisible) {
      document.documentElement.classList.add('focus-visible')
    } else {
      document.documentElement.classList.remove('focus-visible')
    }
  }, [state.preferences, state.focusVisible])

  // Color contrast checker
  const checkColorContrast = useCallback((foreground: string, background: string): {
    ratio: number
    wcagAA: boolean
    wcagAAA: boolean
  } => {
    const getLuminance = (color: string): number => {
      // Simplified luminance calculation
      const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0]
      const [r, g, b] = rgb.map(c => {
        c = c / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    const l1 = getLuminance(foreground)
    const l2 = getLuminance(background)
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

    return {
      ratio,
      wcagAA: ratio >= 4.5,
      wcagAAA: ratio >= 7
    }
  }, [])

  // Keyboard trap for modals
  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }

      if (event.key === 'Escape') {
        // Close modal or return focus
        const closeButton = container.querySelector('[aria-label*="close"]') as HTMLElement
        if (closeButton) {
          closeButton.click()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Generate accessible IDs
  const generateId = useCallback((prefix: string = 'a11y'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Validate form accessibility
  const validateFormAccessibility = useCallback((form: HTMLFormElement): {
    valid: boolean
    issues: string[]
  } => {
    const issues: string[] = []
    const inputs = form.querySelectorAll('input, select, textarea')

    inputs.forEach((input) => {
      const element = input as HTMLInputElement
      
      // Check for labels
      const hasLabel = element.labels && element.labels.length > 0
      const hasAriaLabel = element.hasAttribute('aria-label')
      const hasAriaLabelledBy = element.hasAttribute('aria-labelledby')
      
      if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push(`Input ${element.name || element.id || 'unknown'} lacks proper labeling`)
      }

      // Check required fields
      if (element.required && !element.hasAttribute('aria-required')) {
        issues.push(`Required field ${element.name || element.id || 'unknown'} should have aria-required`)
      }

      // Check error states
      if (element.hasAttribute('aria-invalid') && element.getAttribute('aria-invalid') === 'true') {
        const hasErrorDescription = element.hasAttribute('aria-describedby')
        if (!hasErrorDescription) {
          issues.push(`Invalid field ${element.name || element.id || 'unknown'} lacks error description`)
        }
      }
    })

    return {
      valid: issues.length === 0,
      issues
    }
  }, [])

  return {
    ...state,
    announce,
    focusElement,
    skipToMain,
    checkColorContrast,
    trapFocus,
    generateId,
    validateFormAccessibility
  }
}

// Accessibility utilities
export const a11yUtils = {
  // Screen reader only text
  srOnly: 'sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
  
  // Focus styles
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  
  // Skip link styles
  skipLink: 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-primary-600 focus:text-white focus:no-underline',
  
  // High contrast colors
  highContrast: {
    text: 'text-black dark:text-white',
    background: 'bg-white dark:bg-black',
    border: 'border-black dark:border-white'
  }
}
