import { create } from 'zustand'
import type { FormState, UserCase, AdditionalFactors } from '../types'

interface FormStore extends FormState {
  // Actions
  setCurrentStep: (step: number) => void
  setJurisdiction: (jurisdiction: string) => void
  addCase: (userCase: UserCase) => void
  updateCase: (index: number, userCase: Partial<UserCase>) => void
  removeCase: (index: number) => void
  setAdditionalFactors: (factors: Partial<AdditionalFactors>) => void
  nextStep: () => void
  previousStep: () => void
  resetForm: () => void
  saveProgress: () => void
  canProceedToNextStep: () => boolean
}

const initialState: FormState = {
  currentStep: 0,
  jurisdiction: '',
  cases: [],
  additionalFactors: {
    hasOpenCases: false,
    isTraffickingVictim: false,
    seekingActualInnocence: false,
  },
  isComplete: false,
  lastSaved: new Date(),
}

export const useFormStore = create<FormStore>((set, get) => ({
  ...initialState,

  setCurrentStep: (step: number) => {
    set({ currentStep: step, lastSaved: new Date() })
  },

  setJurisdiction: (jurisdiction: string) => {
    set({ jurisdiction, lastSaved: new Date() })
  },

  addCase: (userCase: UserCase) => {
    set((state) => ({
      cases: [...state.cases, userCase],
      lastSaved: new Date(),
    }))
  },

  updateCase: (index: number, userCase: Partial<UserCase>) => {
    set((state) => ({
      cases: state.cases.map((c, i) => 
        i === index ? { ...c, ...userCase } : c
      ),
      lastSaved: new Date(),
    }))
  },

  removeCase: (index: number) => {
    set((state) => ({
      cases: state.cases.filter((_, i) => i !== index),
      lastSaved: new Date(),
    }))
  },

  setAdditionalFactors: (factors: Partial<AdditionalFactors>) => {
    set((state) => ({
      additionalFactors: { ...state.additionalFactors, ...factors },
      lastSaved: new Date(),
    }))
  },

  nextStep: () => {
    const { currentStep, canProceedToNextStep } = get()
    if (canProceedToNextStep() && currentStep < 4) {
      set({ currentStep: currentStep + 1, lastSaved: new Date() })
    }
  },

  previousStep: () => {
    const { currentStep } = get()
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1, lastSaved: new Date() })
    }
  },

  resetForm: () => {
    set({ ...initialState, lastSaved: new Date() })
  },

  saveProgress: () => {
    set({ lastSaved: new Date() })
  },

  canProceedToNextStep: () => {
    const { currentStep, jurisdiction, cases } = get()
    
    switch (currentStep) {
      case 0: // Jurisdiction step
        return jurisdiction !== ''
      case 1: // Case info step
        return cases.length > 0 && cases.every(c => 
          c.offense && c.offenseDate && c.outcome && c.ageAtOffense > 0
        )
      case 2: // Conviction details step
        return cases.every(c => {
          if (c.outcome === 'convicted') {
            return c.sentence?.allCompleted !== undefined && 
                   (c.sentence.allCompleted ? c.completionDate : true)
          }
          return true
        })
      case 3: // Additional factors step
        return true // All fields are optional
      case 4: // Results step
        return true
      default:
        return false
    }
  },
}))

// Utility hooks for specific form sections
export const useCurrentStep = () => useFormStore((state) => state.currentStep)
export const useJurisdiction = () => useFormStore((state) => state.jurisdiction)
export const useCases = () => useFormStore((state) => state.cases)
export const useAdditionalFactors = () => useFormStore((state) => state.additionalFactors)
export const useFormActions = () => useFormStore((state) => ({
  setCurrentStep: state.setCurrentStep,
  setJurisdiction: state.setJurisdiction,
  addCase: state.addCase,
  updateCase: state.updateCase,
  removeCase: state.removeCase,
  setAdditionalFactors: state.setAdditionalFactors,
  nextStep: state.nextStep,
  previousStep: state.previousStep,
  resetForm: state.resetForm,
  saveProgress: state.saveProgress,
  canProceedToNextStep: state.canProceedToNextStep,
}))
