import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProtectedRoute from '../../components/common/ProtectedRoute'
import { useFormStore } from '../../store/formStore'

// Mock the form store
vi.mock('../../store/formStore')

const mockUseFormStore = vi.mocked(useFormStore)

const TestComponent = () => <div>Protected Content</div>

const renderProtectedRoute = (requiredStep: number, initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <ProtectedRoute requiredStep={requiredStep}>
        <TestComponent />
      </ProtectedRoute>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Step 0 (Home) - Always Accessible', () => {
    it('should allow access to home page', () => {
      mockUseFormStore.mockReturnValue({
        currentStep: 0,
        jurisdiction: '',
        cases: []
      } as any)

      renderProtectedRoute(0)
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  describe('Step 1 (Jurisdiction) - Always Accessible', () => {
    it('should allow access to jurisdiction step', () => {
      mockUseFormStore.mockReturnValue({
        currentStep: 1,
        jurisdiction: '',
        cases: []
      } as any)

      renderProtectedRoute(1)
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  describe('Step 2 (Case Info) - Requires Jurisdiction', () => {
    it('should allow access when jurisdiction is set', () => {
      mockUseFormStore.mockReturnValue({
        currentStep: 2,
        jurisdiction: 'dc',
        cases: []
      } as any)

      renderProtectedRoute(2)
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should show redirecting when jurisdiction is missing', async () => {
      mockUseFormStore.mockReturnValue({
        currentStep: 2,
        jurisdiction: '',
        cases: []
      } as any)

      renderProtectedRoute(2)
      
      await waitFor(() => {
        expect(screen.getByText('Redirecting...')).toBeInTheDocument()
        expect(screen.getByText('Please complete the previous steps first.')).toBeInTheDocument()
      })
    })
  })

  describe('Step 3 (Conviction Details) - Requires Jurisdiction and Cases', () => {
    it('should allow access when requirements are met', () => {
      mockUseFormStore.mockReturnValue({
        currentStep: 3,
        jurisdiction: 'dc',
        cases: [{ offense: 'Test offense', offenseDate: new Date(), outcome: 'convicted', ageAtOffense: 25 }]
      } as any)

      renderProtectedRoute(3)
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should block access when cases are missing', async () => {
      mockUseFormStore.mockReturnValue({
        currentStep: 3,
        jurisdiction: 'dc',
        cases: []
      } as any)

      renderProtectedRoute(3)
      
      await waitFor(() => {
        expect(screen.getByText('Redirecting...')).toBeInTheDocument()
      })
    })
  })

  describe('Step 4 (Additional Factors) - Requires Complete Case Data', () => {
    it('should allow access when all case data is complete', () => {
      mockUseFormStore.mockReturnValue({
        currentStep: 4,
        jurisdiction: 'dc',
        cases: [{
          offense: 'Simple marijuana possession',
          offenseDate: new Date('2020-01-01'),
          outcome: 'convicted',
          ageAtOffense: 25
        }]
      } as any)

      renderProtectedRoute(4)
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should block access when case data is incomplete', async () => {
      mockUseFormStore.mockReturnValue({
        currentStep: 4,
        jurisdiction: 'dc',
        cases: [{
          offense: '',
          offenseDate: new Date(),
          outcome: 'convicted',
          ageAtOffense: 0
        }]
      } as any)

      renderProtectedRoute(4)
      
      await waitFor(() => {
        expect(screen.getByText('Redirecting...')).toBeInTheDocument()
      })
    })
  })

  describe('Step 5 (Results) - Requires All Previous Steps', () => {
    it('should allow access when all requirements are met', () => {
      mockUseFormStore.mockReturnValue({
        currentStep: 5,
        jurisdiction: 'dc',
        cases: [{
          offense: 'Simple marijuana possession',
          offenseDate: new Date('2020-01-01'),
          outcome: 'convicted',
          ageAtOffense: 25
        }]
      } as any)

      renderProtectedRoute(5)
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('should block access when requirements are not met', async () => {
      mockUseFormStore.mockReturnValue({
        currentStep: 5,
        jurisdiction: '',
        cases: []
      } as any)

      renderProtectedRoute(5)
      
      await waitFor(() => {
        expect(screen.getByText('Redirecting...')).toBeInTheDocument()
      })
    })
  })

  describe('Security Edge Cases', () => {
    it('should handle invalid step numbers', async () => {
      mockUseFormStore.mockReturnValue({
        currentStep: 0,
        jurisdiction: 'dc',
        cases: []
      } as any)

      renderProtectedRoute(999)
      
      await waitFor(() => {
        expect(screen.getByText('Redirecting...')).toBeInTheDocument()
      })
    })

    it('should handle negative step numbers', async () => {
      mockUseFormStore.mockReturnValue({
        currentStep: 0,
        jurisdiction: 'dc',
        cases: []
      } as any)

      renderProtectedRoute(-1)
      
      await waitFor(() => {
        expect(screen.getByText('Redirecting...')).toBeInTheDocument()
      })
    })

    it('should prevent direct URL manipulation', async () => {
      // Simulate user trying to access results directly without completing steps
      mockUseFormStore.mockReturnValue({
        currentStep: 0,
        jurisdiction: '',
        cases: []
      } as any)

      renderProtectedRoute(5, '/results')
      
      await waitFor(() => {
        expect(screen.getByText('Redirecting...')).toBeInTheDocument()
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
      })
    })
  })
})
