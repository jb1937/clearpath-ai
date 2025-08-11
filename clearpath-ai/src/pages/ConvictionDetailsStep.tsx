import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFormStore } from '../store/formStore'
import type { Sentence } from '../types'

const ConvictionDetailsStep: React.FC = () => {
  const navigate = useNavigate()
  const { cases, updateCase, setCurrentStep } = useFormStore()
  const [sentence, setSentence] = useState<Sentence>({
    jailTime: 0,
    probation: 0,
    fines: 0,
    communityService: 0,
    allCompleted: false
  })
  const [completionDate, setCompletionDate] = useState<Date | undefined>()
  const [sentenceTypes, setSentenceTypes] = useState<string[]>([])

  const currentCase = cases[0]

  const handleSentenceTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSentenceTypes([...sentenceTypes, type])
    } else {
      setSentenceTypes(sentenceTypes.filter(t => t !== type))
      // Clear the corresponding value
      setSentence({ ...sentence, [type]: 0 })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentCase) {
      alert('No case information found. Please go back and enter your case details.')
      return
    }

    if (sentence.allCompleted && !completionDate) {
      alert('Please provide the date when you completed your sentence.')
      return
    }

    const updatedCase = {
      ...currentCase,
      sentence,
      completionDate: sentence.allCompleted ? completionDate : undefined
    }

    updateCase(0, updatedCase)
    setCurrentStep(3)
    navigate('/additional-factors')
  }

  const handleBack = () => {
    navigate('/case-info')
  }

  // Load existing data if available
  useEffect(() => {
    if (currentCase?.sentence) {
      setSentence(currentCase.sentence)
      setCompletionDate(currentCase.completionDate)
      
      // Determine which sentence types were selected
      const types = []
      if (currentCase.sentence.jailTime && currentCase.sentence.jailTime > 0) types.push('jailTime')
      if (currentCase.sentence.probation && currentCase.sentence.probation > 0) types.push('probation')
      if (currentCase.sentence.fines && currentCase.sentence.fines > 0) types.push('fines')
      if (currentCase.sentence.communityService && currentCase.sentence.communityService > 0) types.push('communityService')
      setSentenceTypes(types)
    }
  }, [currentCase])

  if (!currentCase) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            No Case Information Found
          </h1>
          <p className="text-gray-600 mb-6">
            Please go back and enter your case information first.
          </p>
          <button onClick={handleBack} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Conviction Details
        </h1>
        <p className="text-gray-600 mb-6">
          Since you were convicted, please provide details about your sentence.
        </p>

        {/* Case Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Your Case:</h3>
          <p className="text-sm text-gray-700">
            <strong>Charge:</strong> {currentCase.offense}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Date:</strong> {currentCase.offenseDate.toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Outcome:</strong> {currentCase.outcome}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sentence Types */}
          <div>
            <label className="form-label">
              What was your sentence? (Check all that apply) *
            </label>
            <div className="space-y-3">
              {[
                { key: 'jailTime', label: 'Jail/Prison time', unit: 'months' },
                { key: 'probation', label: 'Probation', unit: 'months' },
                { key: 'fines', label: 'Fine', unit: 'dollars' },
                { key: 'communityService', label: 'Community service', unit: 'hours' }
              ].map((type) => (
                <div key={type.key} className="border border-gray-200 rounded-lg p-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={sentenceTypes.includes(type.key)}
                      onChange={(e) => handleSentenceTypeChange(type.key, e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="font-medium text-gray-900">{type.label}</span>
                  </label>
                  
                  {sentenceTypes.includes(type.key) && (
                    <div className="mt-3 ml-6">
                      <input
                        type="number"
                        className="form-input w-32"
                        placeholder={`${type.unit}`}
                        min="0"
                        value={sentence[type.key as keyof Sentence]?.toString() || ''}
                        onChange={(e) => setSentence({
                          ...sentence,
                          [type.key]: parseFloat(e.target.value) || 0
                        })}
                      />
                      <span className="ml-2 text-sm text-gray-600">{type.unit}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sentence Completion */}
          <div>
            <label className="form-label">
              Have you completed ALL aspects of your sentence? *
            </label>
            <div className="space-y-2">
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="completed"
                  checked={sentence.allCompleted === true}
                  onChange={() => setSentence({ ...sentence, allCompleted: true })}
                  className="mt-1 border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Yes, everything is completed</div>
                  <div className="text-sm text-gray-600">
                    All jail time served, probation completed, fines paid, community service finished
                  </div>
                </div>
              </label>
              
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="completed"
                  checked={sentence.allCompleted === false}
                  onChange={() => setSentence({ ...sentence, allCompleted: false })}
                  className="mt-1 border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-gray-900">No, I still have obligations</div>
                  <div className="text-sm text-gray-600">
                    Still on probation, have unpaid fines, or other incomplete requirements
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Completion Date */}
          {sentence.allCompleted && (
            <div>
              <label className="form-label">
                When did you complete your sentence? *
              </label>
              <input
                type="date"
                className="form-input"
                value={completionDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setCompletionDate(new Date(e.target.value))}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This date is important for calculating waiting periods for relief options
              </p>
            </div>
          )}

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Why This Matters</h4>
                <p className="text-sm text-blue-800">
                  Completing your sentence is required for most relief options. The completion date 
                  determines when waiting periods begin for automatic sealing (10 years) and 
                  motion-based sealing (5 years).
                </p>
              </div>
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

export default ConvictionDetailsStep
