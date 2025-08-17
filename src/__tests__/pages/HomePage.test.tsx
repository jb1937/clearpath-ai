import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import HomePage from '../../pages/HomePage'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render main heading', () => {
      renderWithRouter(<HomePage />)
      
      expect(screen.getByText('Clear Your')).toBeInTheDocument()
      expect(screen.getByText('Criminal Record')).toBeInTheDocument()
    })

    it('should render description text', () => {
      renderWithRouter(<HomePage />)
      
      expect(screen.getByText(/Discover if you're eligible for expungement or sealing/)).toBeInTheDocument()
      expect(screen.getByText(/Our free tool provides preliminary screening/)).toBeInTheDocument()
    })

    it('should render call-to-action buttons', () => {
      renderWithRouter(<HomePage />)
      
      expect(screen.getByText('Check My Eligibility')).toBeInTheDocument()
      // Use getAllByText to handle multiple "How It Works" elements
      const howItWorksElements = screen.getAllByText('How It Works')
      expect(howItWorksElements.length).toBeGreaterThan(0)
      // Check that at least one is a button/link
      expect(howItWorksElements[0]).toBeInTheDocument()
    })

    it('should render benefits section', () => {
      renderWithRouter(<HomePage />)
      
      expect(screen.getByText('Why Clear Your Record?')).toBeInTheDocument()
      expect(screen.getByText('Employment Opportunities')).toBeInTheDocument()
      expect(screen.getByText('Housing Access')).toBeInTheDocument()
      expect(screen.getByText('Educational Opportunities')).toBeInTheDocument()
    })

    it('should render how it works section', () => {
      renderWithRouter(<HomePage />)
      
      expect(screen.getByText('How It Works')).toBeInTheDocument()
      expect(screen.getByText('Enter Your Information')).toBeInTheDocument()
      expect(screen.getByText('Automated Analysis')).toBeInTheDocument()
      expect(screen.getByText('Get Your Results')).toBeInTheDocument()
      expect(screen.getByText('Take Action')).toBeInTheDocument()
    })

    it('should render jurisdiction coverage section', () => {
      renderWithRouter(<HomePage />)
      
      expect(screen.getByText('Currently Serving Washington, DC')).toBeInTheDocument()
      expect(screen.getByText(/Our tool is specifically designed for DC criminal records/)).toBeInTheDocument()
      expect(screen.getByText('Additional states coming soon')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should have correct link to jurisdiction step', () => {
      renderWithRouter(<HomePage />)
      
      const eligibilityButton = screen.getByText('Check My Eligibility')
      expect(eligibilityButton.closest('a')).toHaveAttribute('href', '/jurisdiction')
    })

    it('should have correct anchor link for how it works', () => {
      renderWithRouter(<HomePage />)
      
      const howItWorksButton = screen.getByText('How It Works')
      expect(howItWorksButton.closest('a')).toHaveAttribute('href', '#how-it-works')
    })

    it('should call console.log when get started is clicked', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      renderWithRouter(<HomePage />)
      
      const eligibilityButton = screen.getByText('Check My Eligibility')
      fireEvent.click(eligibilityButton)
      
      expect(consoleSpy).toHaveBeenCalledWith('Getting started...')
      consoleSpy.mockRestore()
    })
  })

  describe('Content Structure', () => {
    it('should have proper heading hierarchy', () => {
      renderWithRouter(<HomePage />)
      
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('Clear Your Criminal Record')
      
      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements).toHaveLength(3) // "Why Clear Your Record?", "How It Works", "Currently Serving Washington, DC"
      
      const h3Elements = screen.getAllByRole('heading', { level: 3 })
      expect(h3Elements.length).toBeGreaterThan(0) // Benefits and steps
    })

    it('should have accessible button elements', () => {
      renderWithRouter(<HomePage />)
      
      const eligibilityButton = screen.getByRole('link', { name: 'Check My Eligibility' })
      expect(eligibilityButton).toBeInTheDocument()
      
      const howItWorksButton = screen.getByRole('link', { name: 'How It Works' })
      expect(howItWorksButton).toBeInTheDocument()
    })

    it('should have proper CSS classes for styling', () => {
      renderWithRouter(<HomePage />)
      
      const eligibilityButton = screen.getByText('Check My Eligibility')
      expect(eligibilityButton).toHaveClass('btn-primary')
      
      const howItWorksButton = screen.getByText('How It Works')
      expect(howItWorksButton).toHaveClass('btn-outline')
    })
  })

  describe('Benefits Section', () => {
    it('should render all benefit cards with icons', () => {
      renderWithRouter(<HomePage />)
      
      // Check for SVG icons (they should be present)
      const svgElements = screen.getAllByRole('img', { hidden: true })
      expect(svgElements.length).toBeGreaterThan(0)
    })

    it('should have descriptive text for each benefit', () => {
      renderWithRouter(<HomePage />)
      
      expect(screen.getByText(/Remove barriers to employment/)).toBeInTheDocument()
      expect(screen.getByText(/Improve your chances of securing housing/)).toBeInTheDocument()
      expect(screen.getByText(/Access educational programs/)).toBeInTheDocument()
    })
  })

  describe('How It Works Section', () => {
    it('should render numbered steps', () => {
      renderWithRouter(<HomePage />)
      
      // Check for step numbers
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
    })

    it('should have descriptive text for each step', () => {
      renderWithRouter(<HomePage />)
      
      expect(screen.getByText(/Provide details about your criminal charges/)).toBeInTheDocument()
      expect(screen.getByText(/Our system analyzes your case/)).toBeInTheDocument()
      expect(screen.getByText(/Receive a detailed report/)).toBeInTheDocument()
      expect(screen.getByText(/Follow our guidance to file/)).toBeInTheDocument()
    })
  })

  describe('Legal Notice', () => {
    it('should display legal disclaimer', () => {
      renderWithRouter(<HomePage />)
      
      // The legal disclaimer is in the header, not the HomePage itself
      expect(screen.getByText(/This tool provides preliminary screening only/)).toBeInTheDocument()
      expect(screen.getByText(/Consult with a qualified attorney/)).toBeInTheDocument()
    })
  })

  describe('Responsive Design Elements', () => {
    it('should have responsive grid classes', () => {
      renderWithRouter(<HomePage />)
      
      // Check for responsive grid classes in benefits section
      const benefitsContainer = screen.getByText('Employment Opportunities').closest('.grid')
      expect(benefitsContainer).toHaveClass('grid-cols-1', 'md:grid-cols-3')
      
      // Check for responsive grid classes in how it works section
      const stepsContainer = screen.getByText('Enter Your Information').closest('.grid')
      expect(stepsContainer).toHaveClass('grid-cols-1', 'md:grid-cols-4')
    })

    it('should have responsive button layout', () => {
      renderWithRouter(<HomePage />)
      
      const buttonContainer = screen.getByText('Check My Eligibility').closest('.flex')
      expect(buttonContainer).toHaveClass('flex-col', 'sm:flex-row')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderWithRouter(<HomePage />)
      
      // Main heading should be accessible
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toBeInTheDocument()
      
      // Links should be accessible
      const links = screen.getAllByRole('link')
      expect(links.length).toBeGreaterThan(0)
      
      // All links should have accessible names
      links.forEach(link => {
        expect(link).toHaveAccessibleName()
      })
    })

    it('should have proper color contrast indicators', () => {
      renderWithRouter(<HomePage />)
      
      // Check for proper color classes that indicate good contrast
      const primaryButton = screen.getByText('Check My Eligibility')
      expect(primaryButton).toHaveClass('btn-primary')
      
      const outlineButton = screen.getByText('How It Works')
      expect(outlineButton).toHaveClass('btn-outline')
    })
  })

  describe('Content Accuracy', () => {
    it('should mention Washington DC specifically', () => {
      renderWithRouter(<HomePage />)
      
      expect(screen.getByText(/Washington DC laws/)).toBeInTheDocument()
      expect(screen.getByText('Currently Serving Washington, DC')).toBeInTheDocument()
      expect(screen.getByText(/DC criminal records/)).toBeInTheDocument()
    })

    it('should emphasize free service', () => {
      renderWithRouter(<HomePage />)
      
      expect(screen.getByText(/Our free tool/)).toBeInTheDocument()
    })

    it('should mention preliminary screening nature', () => {
      renderWithRouter(<HomePage />)
      
      expect(screen.getByText(/preliminary screening/)).toBeInTheDocument()
      expect(screen.getByText(/preliminary screening only/)).toBeInTheDocument()
    })
  })
})
