import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFormStore } from '../store/formStore'
import { DC_OFFENSES } from '../data/jurisdictions/dc'
import { dataSecurityService } from '../services/dataSecurity'
import { checkRateLimit } from '../config/env'
import type { UserCase } from '../types'

const CaseInfoStep: React.FC = () => {
  const navigate = useNavigate()
  const { cases, addCase, updateCase, setCurrentStep } = useFormStore()
  const [currentCase, setCurrentCase] = useState<Partial<UserCase>>({
    offense: '',
    offenseDate: new Date(),
    outcome: 'convicted',
    ageAtOffense: 18,
    isTraffickingRelated: false,
    jurisdiction: 'dc'
  })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredOffenses, setFilteredOffenses] = useState(DC_OFFENSES)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleOffenseSearch = (value: string) => {
    // Always update the input value first for responsive typing
    setCurrentCase({ ...currentCase, offense: value })
    
    // Only apply rate limiting to the search functionality, not input updates
    if (value.length > 2) {
      if (!checkRateLimit('offense-search')) {
        console.warn('Rate limit exceeded for offense search')
        // Still allow typing, just don't show suggestions
        setShowSuggestions(false)
        return
      }
      
      // Sanitize for search but don't block input
      const sanitizedValue = dataSecurityService.sanitizeInput(value)
      
      const filtered = DC_OFFENSES.filter(offense =>
        offense.name.toLowerCase().includes(sanitizedValue.toLowerCase()) ||
        offense.keywords.some(keyword => 
          keyword.toLowerCase().includes(sanitizedValue.toLowerCase())
        )
      ).slice(0, 8) // Limit to 8 suggestions
      
      setFilteredOffenses(filtered)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const selectOffense = (offense: typeof DC_OFFENSES[0]) => {
    setCurrentCase({ ...currentCase, offense: offense.name })
    setShowSuggestions(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentCase.offense || !currentCase.offenseDate || !currentCase.outcome || !currentCase.ageAtOffense) {
      alert('Please fill in all required fields')
      return
    }

    const newCase: UserCase = {
      id: Date.now().toString(),
      offense: currentCase.offense,
      offenseDate: currentCase.offenseDate,
      outcome: currentCase.outcome as UserCase['outcome'],
      ageAtOffense: currentCase.ageAtOffense,
      isTraffickingRelated: currentCase.isTraffickingRelated || false,
      jurisdiction: 'dc'
    }

    if (cases.length === 0) {
      addCase(newCase)
    } else {
      updateCase(0, newCase)
    }

    setCurrentStep(2)
    
    // Navigate based on outcome
    if (newCase.outcome === 'convicted') {
      navigate('/conviction-details')
    } else {
      navigate('/additional-factors')
    }
  }

  const handleBack = () => {
    navigate('/jurisdiction')
  }

  // Load existing case data if available
  useEffect(() => {
    if (cases.length > 0) {
      const existingCase = cases[0]
      setCurrentCase({
        offense: existingCase.offense,
        offenseDate: existingCase.offenseDate,
        outcome: existingCase.outcome,
        ageAtOffense: existingCase.ageAtOffense,
        isTraffickingRelated: existingCase.isTraffickingRelated
      })
    }
  }, [cases])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (inputRef.current && !inputRef.current.contains(target)) {
        // Check if the click is on a suggestion item
        const suggestionDropdown = document.querySelector('.suggestion-dropdown')
        if (suggestionDropdown && suggestionDropdown.contains(target)) {
          return // Don't close if clicking on a suggestion
        }
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Case Information
        </h1>
        <p className="text-gray-600 mb-6">
          Tell us about your criminal case. We'll start with your most recent or most serious charge.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Offense Input with Autocomplete */}
          <div className="relative">
            <label className="form-label">
              What was the charge/offense? *
            </label>
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              placeholder="Start typing (e.g., Simple Assault, DUI, Theft...)"
              value={currentCase.offense || ''}
              onChange={(e) => handleOffenseSearch(e.target.value)}
              required
            />
            
            {/* Autocomplete Suggestions */}
            {showSuggestions && filteredOffenses.length > 0 && (
              <div className="suggestion-dropdown absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredOffenses.map((offense) => (
                  <div
                    key={offense.id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onMouseDown={(e) => {
                      e.preventDefault() // Prevent input from losing focus
                      selectOffense(offense)
                    }}
                    onClick={(e) => {
                      e.preventDefault() // Prevent any default behavior
                      selectOffense(offense)
                    }}
                  >
                    <div className="font-medium text-gray-900">{offense.name}</div>
                    <div className="text-sm text-gray-600">
                      {offense.statuteNumbers.join(', ')} • {offense.severity}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-1">
              Start typing to see suggestions, or enter the exact charge name
            </p>
          </div>

          {/* Offense Date */}
          <div>
            <label className="form-label">
              When did this offense occur? *
            </label>
            <input
              type="date"
              className="form-input"
              value={currentCase.offenseDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => setCurrentCase({ 
                ...currentCase, 
                offenseDate: new Date(e.target.value) 
              })}
              required
            />
          </div>

          {/* Age at Offense */}
          <div>
            <label className="form-label">
              How old were you when this offense occurred? *
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="Age"
              min="1"
              max="100"
              value={currentCase.ageAtOffense || ''}
              onChange={(e) => setCurrentCase({ 
                ...currentCase, 
                ageAtOffense: parseInt(e.target.value) 
              })}
              required
            />
            {currentCase.ageAtOffense && currentCase.ageAtOffense <= 24 && (
              <p className="text-sm text-blue-600 mt-1">
                ℹ️ You may qualify for Youth Rehabilitation Act consideration
              </p>
            )}
          </div>

          {/* Case Outcome */}
          <div>
            <label className="form-label">
              What was the final outcome of your case? *
            </label>
            <div className="space-y-2">
              {[
                { value: 'convicted', label: 'Convicted (found guilty)', description: 'You were found guilty or pled guilty/no contest' },
                { value: 'dismissed', label: 'Dismissed', description: 'Case was dismissed by the court' },
                { value: 'acquitted', label: 'Acquitted (found not guilty)', description: 'You were found not guilty at trial' },
                { value: 'no_papered', label: 'No Papered', description: 'Prosecutor declined to file charges' },
                { value: 'nolle_prosequi', label: 'Nolle Prosequi', description: 'Prosecutor dropped the charges' }
              ].map((outcome) => (
                <label key={outcome.value} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="outcome"
                    value={outcome.value}
                    checked={currentCase.outcome === outcome.value}
                    onChange={(e) => setCurrentCase({ 
                      ...currentCase, 
                      outcome: e.target.value as UserCase['outcome']
                    })}
                    className="mt-1 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{outcome.label}</div>
                    <div className="text-sm text-gray-600">{outcome.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>


          <div className="mt-8 flex justify-between">
            <button 
              type="button"
              onClick={handleBack}
              className="btn-outline"
            >
              Back
            </button>
            <button 
              type="submit"
              className="btn-primary"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CaseInfoStep
