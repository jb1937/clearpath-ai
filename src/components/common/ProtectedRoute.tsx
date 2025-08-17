import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFormStore } from '../../store/formStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredStep: number
  redirectTo?: string
}

/**
 * Route protection component that ensures users complete steps in order
 * and prevents direct navigation to advanced steps without proper data
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredStep, 
  redirectTo = '/' 
}) => {
  const navigate = useNavigate()
  const { currentStep, jurisdiction, cases } = useFormStore()

  useEffect(() => {
    // Check if user has completed required previous steps
    const hasRequiredData = () => {
      switch (requiredStep) {
        case 0: // Home page - always accessible
          return true
        case 1: // Jurisdiction step - always accessible after home
          return true
        case 2: // Case info step - requires jurisdiction
          return jurisdiction !== ''
        case 3: // Conviction details - requires jurisdiction and at least one case
          return jurisdiction !== '' && cases.length > 0
        case 4: // Additional factors - requires previous steps
          return jurisdiction !== '' && cases.length > 0 && 
                 cases.every(c => c.offense && c.offenseDate && c.outcome && c.ageAtOffense > 0)
        case 5: // Results - requires all previous steps
          return jurisdiction !== '' && cases.length > 0 && 
                 cases.every(c => c.offense && c.offenseDate && c.outcome && c.ageAtOffense > 0)
        default:
          return false
      }
    }

    if (!hasRequiredData()) {
      console.warn(`Access denied to step ${requiredStep}. Redirecting to ${redirectTo}`)
      navigate(redirectTo, { replace: true })
    }
  }, [currentStep, requiredStep, redirectTo, navigate, jurisdiction, cases])

  // Additional check for direct access prevention
  const hasRequiredData = () => {
    switch (requiredStep) {
      case 0:
        return true
      case 1:
        return true
      case 2:
        return jurisdiction !== ''
      case 3:
        return jurisdiction !== '' && cases.length > 0
      case 4:
        return jurisdiction !== '' && cases.length > 0 && 
               cases.every(c => c.offense && c.offenseDate && c.outcome && c.ageAtOffense > 0)
      case 5:
        return jurisdiction !== '' && cases.length > 0 && 
               cases.every(c => c.offense && c.offenseDate && c.outcome && c.ageAtOffense > 0)
      default:
        return false
    }
  }

  // Show loading state while checking
  if (!hasRequiredData()) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-primary-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Redirecting...</h2>
          <p className="text-gray-600">
            Please complete the previous steps first.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
