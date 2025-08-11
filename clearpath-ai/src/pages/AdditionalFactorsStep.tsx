import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFormStore } from '../store/formStore'

const AdditionalFactorsStep: React.FC = () => {
  const navigate = useNavigate()
  const { additionalFactors, setAdditionalFactors, setCurrentStep } = useFormStore()
  const [factors, setFactors] = useState({
    hasOpenCases: false,
    isTraffickingVictim: false,
    seekingActualInnocence: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    setAdditionalFactors(factors)
    setCurrentStep(4)
    navigate('/results')
  }

  const handleBack = () => {
    navigate('/conviction-details')
  }

  // Load existing data if available
  useEffect(() => {
    if (additionalFactors) {
      setFactors({
        hasOpenCases: additionalFactors.hasOpenCases || false,
        isTraffickingVictim: additionalFactors.isTraffickingVictim || false,
        seekingActualInnocence: additionalFactors.seekingActualInnocence || false
      })
    }
  }, [additionalFactors])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Additional Factors
        </h1>
        <p className="text-gray-600 mb-6">
          These questions help us provide more accurate results and identify special relief options.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Open Cases */}
          <div>
            <label className="form-label">
              Do you currently have any open or pending criminal cases?
            </label>
            <div className="space-y-2">
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="openCases"
                  checked={factors.hasOpenCases === true}
                  onChange={() => setFactors({ ...factors, hasOpenCases: true })}
                  className="mt-1 border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Yes</div>
                  <div className="text-sm text-gray-600">
                    I have pending charges or cases that haven't been resolved
                  </div>
                </div>
              </label>
              
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="openCases"
                  checked={factors.hasOpenCases === false}
                  onChange={() => setFactors({ ...factors, hasOpenCases: false })}
                  className="mt-1 border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-gray-900">No</div>
                  <div className="text-sm text-gray-600">
                    All my criminal cases have been resolved
                  </div>
                </div>
              </label>
            </div>
            
            {factors.hasOpenCases && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm text-amber-800">
                      <strong>Important:</strong> Having open cases may affect your eligibility for some relief options. 
                      You should resolve pending cases before pursuing record sealing or expungement.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Human Trafficking */}
          <div>
            <label className="form-label">
              Were you a victim of human trafficking related to this charge?
            </label>
            <div className="space-y-2">
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="trafficking"
                  checked={factors.isTraffickingVictim === true}
                  onChange={() => setFactors({ ...factors, isTraffickingVictim: true })}
                  className="mt-1 border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Yes</div>
                  <div className="text-sm text-gray-600">
                    I was a victim of human trafficking and this charge was related to that situation
                  </div>
                </div>
              </label>
              
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="trafficking"
                  checked={factors.isTraffickingVictim === false}
                  onChange={() => setFactors({ ...factors, isTraffickingVictim: false })}
                  className="mt-1 border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-gray-900">No</div>
                  <div className="text-sm text-gray-600">
                    This charge was not related to human trafficking
                  </div>
                </div>
              </label>
            </div>
            
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-blue-800">
                    Human trafficking survivors may qualify for special relief options, including 
                    expedited processing and waived filing fees.
                  </p>
                </div>
              </div>
            </div>

            {factors.isTraffickingVictim && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-green-800">
                      <strong>Good news:</strong> You may qualify for Human Trafficking Survivors Relief, 
                      which offers expedited processing and enhanced privacy protections.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actual Innocence */}
          <div>
            <label className="form-label">
              Do you believe you were actually innocent of this charge?
            </label>
            <div className="space-y-2">
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="innocence"
                  checked={factors.seekingActualInnocence === true}
                  onChange={() => setFactors({ ...factors, seekingActualInnocence: true })}
                  className="mt-1 border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Yes</div>
                  <div className="text-sm text-gray-600">
                    I believe I was actually innocent and can prove the offense didn't occur or was committed by someone else
                  </div>
                </div>
              </label>
              
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="innocence"
                  checked={factors.seekingActualInnocence === false}
                  onChange={() => setFactors({ ...factors, seekingActualInnocence: false })}
                  className="mt-1 border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-gray-900">No</div>
                  <div className="text-sm text-gray-600">
                    I am not claiming actual innocence
                  </div>
                </div>
              </label>
            </div>
            
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-blue-800">
                    Actual innocence claims allow for expungement (complete removal) rather than just sealing. 
                    However, you must prove by preponderance of evidence that the offense didn't occur or was committed by someone else.
                  </p>
                </div>
              </div>
            </div>

            {factors.seekingActualInnocence && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm text-amber-800">
                      <strong>Important:</strong> Actual innocence claims require strong evidence and are 
                      challenging to prove. Consider consulting with an attorney who specializes in expungement law.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Box */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">What happens next?</h4>
            <p className="text-sm text-gray-600">
              Based on all the information you've provided, we'll analyze your case against DC's criminal 
              record relief laws and provide you with a detailed assessment of your options, including 
              automatic relief, court motions, and special programs you may qualify for.
            </p>
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
              Get My Results
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdditionalFactorsStep
