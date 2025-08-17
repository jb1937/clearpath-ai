import { describe, it, expect, beforeEach } from 'vitest'
import { useFormStore } from '../../store/formStore'
import { createMockUserCase, createMockAdditionalFactors } from '../../test-utils/test-data'
import { renderHook, act } from '@testing-library/react'

describe('FormStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { resetForm } = useFormStore.getState()
    resetForm()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useFormStore())
      
      expect(result.current.currentStep).toBe(0)
      expect(result.current.jurisdiction).toBe('')
      expect(result.current.cases).toEqual([])
      expect(result.current.additionalFactors).toEqual({
        hasOpenCases: false,
        isTraffickingVictim: false,
        seekingActualInnocence: false,
      })
      expect(result.current.isComplete).toBe(false)
    })
  })

  describe('Step Navigation', () => {
    it('should set current step', () => {
      const { result } = renderHook(() => useFormStore())
      
      act(() => {
        result.current.setCurrentStep(2)
      })
      
      expect(result.current.currentStep).toBe(2)
    })

    it('should move to next step when validation passes', () => {
      const { result } = renderHook(() => useFormStore())
      
      // Set jurisdiction to pass step 0 validation
      act(() => {
        result.current.setJurisdiction('dc')
        result.current.nextStep()
      })
      
      expect(result.current.currentStep).toBe(1)
    })

    it('should not move to next step when validation fails', () => {
      const { result } = renderHook(() => useFormStore())
      
      // Try to move without setting jurisdiction
      act(() => {
        result.current.nextStep()
      })
      
      expect(result.current.currentStep).toBe(0)
    })

    it('should move to previous step', () => {
      const { result } = renderHook(() => useFormStore())
      
      act(() => {
        result.current.setCurrentStep(2)
        result.current.previousStep()
      })
      
      expect(result.current.currentStep).toBe(1)
    })

    it('should not go below step 0', () => {
      const { result } = renderHook(() => useFormStore())
      
      act(() => {
        result.current.previousStep()
      })
      
      expect(result.current.currentStep).toBe(0)
    })

    it('should not go above step 4', () => {
      const { result } = renderHook(() => useFormStore())
      
      act(() => {
        result.current.setCurrentStep(4)
        result.current.nextStep()
      })
      
      expect(result.current.currentStep).toBe(4)
    })
  })

  describe('Jurisdiction Management', () => {
    it('should set jurisdiction', () => {
      const { result } = renderHook(() => useFormStore())
      
      act(() => {
        result.current.setJurisdiction('dc')
      })
      
      expect(result.current.jurisdiction).toBe('dc')
    })
  })

  describe('Case Management', () => {
    it('should add a case', () => {
      const { result } = renderHook(() => useFormStore())
      const mockCase = createMockUserCase()
      
      act(() => {
        result.current.addCase(mockCase)
      })
      
      expect(result.current.cases).toHaveLength(1)
      expect(result.current.cases[0]).toEqual(mockCase)
    })

    it('should update a case', () => {
      const { result } = renderHook(() => useFormStore())
      const mockCase = createMockUserCase()
      
      act(() => {
        result.current.addCase(mockCase)
        result.current.updateCase(0, { offense: 'Updated Offense' })
      })
      
      expect(result.current.cases[0].offense).toBe('Updated Offense')
    })

    it('should remove a case', () => {
      const { result } = renderHook(() => useFormStore())
      const mockCase1 = createMockUserCase({ id: 'case-1' })
      const mockCase2 = createMockUserCase({ id: 'case-2' })
      
      act(() => {
        result.current.addCase(mockCase1)
        result.current.addCase(mockCase2)
        result.current.removeCase(0)
      })
      
      expect(result.current.cases).toHaveLength(1)
      expect(result.current.cases[0].id).toBe('case-2')
    })

    it('should add multiple cases', () => {
      const { result } = renderHook(() => useFormStore())
      const mockCase1 = createMockUserCase({ id: 'case-1' })
      const mockCase2 = createMockUserCase({ id: 'case-2' })
      
      act(() => {
        result.current.addCase(mockCase1)
        result.current.addCase(mockCase2)
      })
      
      expect(result.current.cases).toHaveLength(2)
    })
  })

  describe('Additional Factors Management', () => {
    it('should set additional factors', () => {
      const { result } = renderHook(() => useFormStore())
      
      act(() => {
        result.current.setAdditionalFactors({
          isTraffickingVictim: true,
          seekingActualInnocence: true,
        })
      })
      
      expect(result.current.additionalFactors.isTraffickingVictim).toBe(true)
      expect(result.current.additionalFactors.seekingActualInnocence).toBe(true)
      expect(result.current.additionalFactors.hasOpenCases).toBe(false) // Should preserve existing values
    })

    it('should partially update additional factors', () => {
      const { result } = renderHook(() => useFormStore())
      
      act(() => {
        result.current.setAdditionalFactors({ hasOpenCases: true })
        result.current.setAdditionalFactors({ isTraffickingVictim: true })
      })
      
      expect(result.current.additionalFactors.hasOpenCases).toBe(true)
      expect(result.current.additionalFactors.isTraffickingVictim).toBe(true)
      expect(result.current.additionalFactors.seekingActualInnocence).toBe(false)
    })
  })

  describe('Form Validation', () => {
    it('should validate step 0 (jurisdiction)', () => {
      const { result } = renderHook(() => useFormStore())
      
      expect(result.current.canProceedToNextStep()).toBe(false)
      
      act(() => {
        result.current.setJurisdiction('dc')
      })
      
      expect(result.current.canProceedToNextStep()).toBe(true)
    })

    it('should validate step 1 (case info)', () => {
      const { result } = renderHook(() => useFormStore())
      
      act(() => {
        result.current.setCurrentStep(1)
      })
      
      expect(result.current.canProceedToNextStep()).toBe(false)
      
      const validCase = createMockUserCase()
      act(() => {
        result.current.addCase(validCase)
      })
      
      expect(result.current.canProceedToNextStep()).toBe(true)
    })

    it('should validate step 1 with incomplete case data', () => {
      const { result } = renderHook(() => useFormStore())
      
      act(() => {
        result.current.setCurrentStep(1)
        result.current.addCase(createMockUserCase({ offense: '' }))
      })
      
      expect(result.current.canProceedToNextStep()).toBe(false)
    })

    it('should validate step 2 (conviction details)', () => {
      const { result } = renderHook(() => useFormStore())
      
      act(() => {
        result.current.setCurrentStep(2)
        result.current.addCase(createMockUserCase({ outcome: 'convicted' }))
      })
      
      expect(result.current.canProceedToNextStep()).toBe(true)
    })

    it('should validate step 2 with incomplete conviction details', () => {
      const { result } = renderHook(() => useFormStore())
      
      act(() => {
        result.current.setCurrentStep(2)
        result.current.addCase(createMockUserCase({
          outcome: 'convicted',
          sentence: undefined
        }))
      })
      
      expect(result.current.canProceedToNextStep()).toBe(false)
    })

    it('should validate step 3 (additional factors) - always valid', () => {
      const { result } = renderHook(() => useFormStore())
      
      act(() => {
        result.current.setCurrentStep(3)
      })
      
      expect(result.current.canProceedToNextStep()).toBe(true)
    })
  })

  describe('Form Reset', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useFormStore())
      
      // Modify state
      act(() => {
        result.current.setCurrentStep(3)
        result.current.setJurisdiction('dc')
        result.current.addCase(createMockUserCase())
        result.current.setAdditionalFactors({ hasOpenCases: true })
      })
      
      // Reset
      act(() => {
        result.current.resetForm()
      })
      
      expect(result.current.currentStep).toBe(0)
      expect(result.current.jurisdiction).toBe('')
      expect(result.current.cases).toEqual([])
      expect(result.current.additionalFactors).toEqual({
        hasOpenCases: false,
        isTraffickingVictim: false,
        seekingActualInnocence: false,
      })
    })
  })

  describe('Progress Saving', () => {
    it('should update lastSaved timestamp when saving progress', () => {
      const { result } = renderHook(() => useFormStore())
      const initialTimestamp = result.current.lastSaved
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        act(() => {
          result.current.saveProgress()
        })
        
        expect(result.current.lastSaved.getTime()).toBeGreaterThan(initialTimestamp.getTime())
      }, 10)
    })

    it('should update lastSaved when making changes', () => {
      const { result } = renderHook(() => useFormStore())
      const initialTimestamp = result.current.lastSaved
      
      setTimeout(() => {
        act(() => {
          result.current.setJurisdiction('dc')
        })
        
        expect(result.current.lastSaved.getTime()).toBeGreaterThan(initialTimestamp.getTime())
      }, 10)
    })
  })

  describe('Utility Hooks', () => {
    it('should provide current step hook', () => {
      const { result: storeResult } = renderHook(() => useFormStore())
      const { result: stepResult } = renderHook(() => useFormStore(state => state.currentStep))
      
      act(() => {
        storeResult.current.setCurrentStep(2)
      })
      
      expect(stepResult.current).toBe(2)
    })

    it('should provide jurisdiction hook', () => {
      const { result: storeResult } = renderHook(() => useFormStore())
      const { result: jurisdictionResult } = renderHook(() => useFormStore(state => state.jurisdiction))
      
      act(() => {
        storeResult.current.setJurisdiction('dc')
      })
      
      expect(jurisdictionResult.current).toBe('dc')
    })

    it('should provide cases hook', () => {
      const { result: storeResult } = renderHook(() => useFormStore())
      const { result: casesResult } = renderHook(() => useFormStore(state => state.cases))
      const mockCase = createMockUserCase()
      
      act(() => {
        storeResult.current.addCase(mockCase)
      })
      
      expect(casesResult.current).toHaveLength(1)
      expect(casesResult.current[0]).toEqual(mockCase)
    })
  })

  describe('Complex Validation Scenarios', () => {
    it('should handle multiple cases with mixed validation states', () => {
      const { result } = renderHook(() => useFormStore())
      
      const validCase = createMockUserCase()
      const invalidCase = createMockUserCase({ offense: '' })
      
      act(() => {
        result.current.setCurrentStep(1)
        result.current.addCase(validCase)
        result.current.addCase(invalidCase)
      })
      
      expect(result.current.canProceedToNextStep()).toBe(false)
    })

    it('should validate conviction details for mixed case outcomes', () => {
      const { result } = renderHook(() => useFormStore())
      
      const convictedCase = createMockUserCase({ outcome: 'convicted' })
      const dismissedCase = createMockUserCase({ outcome: 'dismissed' })
      
      act(() => {
        result.current.setCurrentStep(2)
        result.current.addCase(convictedCase)
        result.current.addCase(dismissedCase)
      })
      
      expect(result.current.canProceedToNextStep()).toBe(true)
    })
  })
})
