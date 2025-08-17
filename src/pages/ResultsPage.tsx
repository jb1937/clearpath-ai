import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFormStore } from '../store/formStore'
import { eligibilityEngine } from '../services/eligibilityEngine'
import { dataSecurityService } from '../services/dataSecurity'
import { config } from '../config/env'
import type { EligibilityResult } from '../types'

const ResultsPage: React.FC = () => {
  const navigate = useNavigate()
  const { cases, additionalFactors, resetForm } = useFormStore()
  const [results, setResults] = useState<EligibilityResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    
    const analyzeCase = async () => {
      try {
        if (!cases || cases.length === 0) {
          if (isMounted) {
            setError('No case information found. Please start over.')
            setLoading(false)
          }
          return
        }

        if (!additionalFactors) {
          if (isMounted) {
            setError('Additional factors information missing. Please complete all steps.')
            setLoading(false)
          }
          return
        }

        // Simulate processing time for better UX
        await new Promise(resolve => setTimeout(resolve, config.analysisSimulationDelay))

        if (!isMounted) return // Exit if component unmounted during delay

        const userCase = cases[0]
        const eligibilityResult = eligibilityEngine.assessEligibility(userCase, additionalFactors)
        
        if (isMounted) {
          setResults(eligibilityResult)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error analyzing case:', err)
        if (isMounted) {
          setError('An error occurred while analyzing your case. Please try again.')
          setLoading(false)
        }
      }
    }

    analyzeCase()
    
    return () => {
      isMounted = false
    }
  }, [cases, additionalFactors])

  const handleStartOver = () => {
    resetForm()
    navigate('/')
  }

  const handleDownloadResults = () => {
    // In a real app, this would generate a PDF
    alert('PDF download functionality would be implemented here')
  }

  const getSuccessLikelihoodColor = (likelihood?: string) => {
    switch (likelihood) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-primary-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Your Case</h2>
          <p className="text-gray-600">
            We're reviewing your information against DC criminal record relief laws...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Analysis Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={handleStartOver} className="btn-primary">
            Start Over
          </button>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Results Available</h2>
          <p className="text-gray-600 mb-6">Unable to generate results. Please try again.</p>
          <button onClick={handleStartOver} className="btn-primary">
            Start Over
          </button>
        </div>
      </div>
    )
  }

  const currentCase = cases[0]
  const eligibleOptions = results.allOptions.filter(option => option.eligible)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Your Eligibility Results
        </h1>
        <p className="text-lg text-gray-600">
          Based on the information you provided, here are your options for criminal record relief.
        </p>
      </div>

      {/* Case Summary */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Case Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Charge:</span>
            <p className="text-gray-900">{dataSecurityService.sanitizeInput(currentCase.offense)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Date:</span>
            <p className="text-gray-900">{currentCase.offenseDate.toLocaleDateString()}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Outcome:</span>
            <p className="text-gray-900 capitalize">{currentCase.outcome.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6">
        {eligibleOptions.length > 0 ? (
          <>
            {/* Best Option */}
            {results.bestOption && (
              <div className="card border-l-4 border-l-success-500">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h2 className="text-xl font-bold text-gray-900">{results.bestOption.name}</h2>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                        Recommended
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{results.bestOption.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Timeline</h4>
                        <p className="text-gray-600">{results.bestOption.timeline || 'Varies'}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Filing Fee</h4>
                        <p className="text-gray-600">
                          {results.bestOption.filingFee !== undefined 
                            ? results.bestOption.filingFee === 0 
                              ? 'Free' 
                              : `$${results.bestOption.filingFee}`
                            : 'N/A'
                          }
                        </p>
                      </div>
                      {results.bestOption.difficulty && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Difficulty</h4>
                          <p className={`capitalize ${getDifficultyColor(results.bestOption.difficulty)}`}>
                            {results.bestOption.difficulty}
                          </p>
                        </div>
                      )}
                      {results.bestOption.successLikelihood && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Success Likelihood</h4>
                          <p className={`capitalize ${getSuccessLikelihoodColor(results.bestOption.successLikelihood)}`}>
                            {results.bestOption.successLikelihood.replace('_', ' ')}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Why You Qualify</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {results.bestOption.reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    {results.bestOption.requirements && results.bestOption.requirements.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Requirements</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {results.bestOption.requirements.map((req, index) => (
                            <li key={index}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Other Options */}
            {eligibleOptions.length > 1 && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Other Available Options</h2>
                <div className="space-y-4">
                  {eligibleOptions.slice(1).map((option, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{option.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                        <div>Timeline: {option.timeline || 'Varies'}</div>
                        <div>
                          Fee: {option.filingFee !== undefined 
                            ? option.filingFee === 0 ? 'Free' : `$${option.filingFee}`
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* No Eligible Options */
          <div className="card border-l-4 border-l-amber-500">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2">No Immediate Relief Available</h2>
                <p className="text-gray-600 mb-4">
                  Based on your case details, you don't currently qualify for automatic relief options. 
                  However, this may change over time or with additional legal consultation.
                </p>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Reasons</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {results.allOptions[0]?.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    )) || ['No specific reasons available']}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        {results.nextSteps && results.nextSteps.length > 0 && (
          <div className="card bg-blue-50 border border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Next Steps</h2>
            <div className="space-y-4">
              {results.nextSteps.map((step, index) => (
                <div key={step.id} className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{step.title}</h4>
                    <p className="text-gray-600 text-sm mb-2">{step.description}</p>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Timeframe:</span> {step.timeframe}
                    </div>
                    {step.resources && step.resources.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700">Resources:</span>
                        <ul className="text-xs text-blue-600 space-y-1 mt-1">
                          {step.resources.map((resource, idx) => (
                            <li key={idx}>
                              <a href={resource.url} className="hover:underline" target="_blank" rel="noopener noreferrer">
                                {resource.title}
                              </a>
                              {resource.description && (
                                <span className="text-gray-500 ml-1">- {resource.description}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Helpful Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Legal Aid</h4>
              <ul className="space-y-1 text-sm">
                <li>
                  <a href="https://www.legalaiddc.org" className="text-primary-600 hover:text-primary-700" target="_blank" rel="noopener noreferrer">
                    Legal Aid DC
                  </a>
                </li>
                <li>
                  <a href="https://www.washlaw.org" className="text-primary-600 hover:text-primary-700" target="_blank" rel="noopener noreferrer">
                    Washington Lawyers' Committee
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Court Information</h4>
              <ul className="space-y-1 text-sm">
                <li>
                  <a href="https://www.dccourts.gov" className="text-primary-600 hover:text-primary-700" target="_blank" rel="noopener noreferrer">
                    DC Superior Court
                  </a>
                </li>
                <li>
                  <a href="https://www.dccourts.gov/services/forms-and-fees" className="text-primary-600 hover:text-primary-700" target="_blank" rel="noopener noreferrer">
                    Sealing Forms & Instructions
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="card bg-amber-50 border border-amber-200">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="font-medium text-amber-900 mb-1">Important Legal Notice</h4>
              <p className="text-sm text-amber-800">
                This assessment provides preliminary screening only and does not constitute legal advice. 
                Laws and eligibility criteria can change, and individual circumstances may affect your options. 
                We strongly recommend consulting with a qualified attorney for case-specific guidance and before 
                filing any court documents.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <button onClick={handleDownloadResults} className="btn-primary">
          Download Results (PDF)
        </button>
        <button onClick={handleStartOver} className="btn-outline">
          Start New Assessment
        </button>
      </div>
    </div>
  )
}

export default ResultsPage
