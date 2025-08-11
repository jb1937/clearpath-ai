import React from 'react'
import { useLocation } from 'react-router-dom'
import type { ProgressStep } from '../../types'

const ProgressIndicator: React.FC = () => {
  const location = useLocation()
  
  // Map routes to step numbers
  const getStepFromPath = (pathname: string): number => {
    switch (pathname) {
      case '/jurisdiction': return 1
      case '/case-info': return 2
      case '/conviction-details': return 3
      case '/additional-factors': return 4
      case '/results': return 5
      default: return 0
    }
  }
  
  const currentStep = getStepFromPath(location.pathname)

  const steps: ProgressStep[] = [
    {
      id: 1,
      title: 'Jurisdiction',
      description: 'Select your location',
      completed: currentStep > 1,
      active: currentStep === 1,
    },
    {
      id: 2,
      title: 'Case Information',
      description: 'Enter your charges',
      completed: currentStep > 2,
      active: currentStep === 2,
    },
    {
      id: 3,
      title: 'Conviction Details',
      description: 'Sentence information',
      completed: currentStep > 3,
      active: currentStep === 3,
    },
    {
      id: 4,
      title: 'Additional Factors',
      description: 'Special circumstances',
      completed: currentStep > 4,
      active: currentStep === 4,
    },
    {
      id: 5,
      title: 'Results',
      description: 'Your eligibility',
      completed: false,
      active: currentStep === 5,
    },
  ]

  return (
    <nav aria-label="Progress" className="progress-indicator">
      <div className="progress-steps">
        {steps.map((step, stepIdx) => (
          <div key={step.id} className="progress-step">
            {/* Step Circle */}
            <div className={`step-circle ${step.completed ? 'completed' : step.active ? 'active' : 'inactive'}`}>
              {step.completed ? (
                <svg className="checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="step-number">{step.id}</span>
              )}
            </div>

            {/* Connector Line */}
            {stepIdx < steps.length - 1 && (
              <div className={`connector-line ${step.completed ? 'completed' : 'incomplete'}`}></div>
            )}

            {/* Step Label */}
            <div className="step-label">
              <div className={`step-title ${step.active ? 'active' : step.completed ? 'completed' : 'inactive'}`}>
                {step.title}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Summary */}
      <div className="progress-summary">
        <span>Step {currentStep} of {steps.length}</span>
        <span>{Math.round((currentStep / steps.length) * 100)}% Complete</span>
      </div>
    </nav>
  )
}

export default ProgressIndicator
