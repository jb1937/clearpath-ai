import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFormStore } from '../store/formStore'

const JurisdictionStep: React.FC = () => {
  const navigate = useNavigate()
  const { jurisdiction, setJurisdiction, setCurrentStep } = useFormStore()
  const [selectedJurisdiction, setSelectedJurisdiction] = useState(jurisdiction || 'dc')

  const handleContinue = () => {
    setJurisdiction(selectedJurisdiction)
    setCurrentStep(1)
    navigate('/case-info')
  }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Select Your Jurisdiction
        </h1>
        <p className="text-gray-600 mb-6">
          Choose the location where your criminal case was handled.
        </p>
        
        <div className="space-y-4">
          {/* Washington DC Option */}
          <div 
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedJurisdiction === 'dc' 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-300 hover:border-primary-500'
            }`}
            onClick={() => setSelectedJurisdiction('dc')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Washington, DC</h3>
                <p className="text-sm text-gray-600">DC Superior Court cases</p>
              </div>
              <div className={`w-4 h-4 border-2 rounded-full ${
                selectedJurisdiction === 'dc'
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-gray-300'
              }`}>
                {selectedJurisdiction === 'dc' && (
                  <div className="w-full h-full rounded-full bg-white scale-50"></div>
                )}
              </div>
            </div>
          </div>
          
          {/* Other States - Coming Soon */}
          <div className="border border-gray-200 rounded-lg p-4 opacity-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-500">Other States</h3>
                <p className="text-sm text-gray-400">Coming soon</p>
              </div>
              <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Information Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">About DC Coverage</h4>
              <p className="text-sm text-blue-800">
                Our tool is specifically designed for Washington DC criminal records and incorporates 
                the latest changes to DC expungement and sealing laws, including automatic sealing 
                provisions that took effect in 2023.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex justify-between">
          <button 
            onClick={handleBack}
            className="btn-outline"
          >
            Back
          </button>
          <button 
            onClick={handleContinue}
            className="btn-primary"
            disabled={!selectedJurisdiction}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export default JurisdictionStep
