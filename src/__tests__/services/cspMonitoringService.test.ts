import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cspMonitoringService } from '../../services/cspMonitoringService'

// Mock DOM methods
const mockQuerySelector = vi.fn()
Object.defineProperty(document, 'querySelector', { value: mockQuerySelector })

// Mock document.addEventListener
const mockAddEventListener = vi.fn()
Object.defineProperty(document, 'addEventListener', { value: mockAddEventListener })

// Mock window.addEventListener
const mockWindowAddEventListener = vi.fn()
Object.defineProperty(window, 'addEventListener', { value: mockWindowAddEventListener })

// Mock window.dispatchEvent
const mockDispatchEvent = vi.fn()
Object.defineProperty(window, 'dispatchEvent', { value: mockDispatchEvent })

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('CSPMonitoringService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Only use fake timers when needed, not globally
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Clean up any fake timers if they were used
    if (vi.isFakeTimers()) {
      vi.useRealTimers()
    }
  })

  describe('initialization', () => {
    it('should set up CSP violation listeners', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'securitypolicyviolation',
        expect.any(Function)
      )
      expect(mockWindowAddEventListener).toHaveBeenCalledWith(
        'securitypolicyviolation',
        expect.any(Function)
      )
    })

    it('should detect reporting endpoint from CSP', () => {
      mockQuerySelector.mockReturnValue({
        getAttribute: () => 'default-src \'self\'; report-uri /api/csp-report'
      })

      // Re-instantiate to test endpoint detection
      const service = cspMonitoringService
      expect(service).toBeDefined()
    })
  })

  describe('violation handling', () => {
    it('should handle CSP violation events', () => {
      const mockViolationEvent = {
        documentURI: 'https://example.com',
        referrer: 'https://referrer.com',
        violatedDirective: 'script-src',
        effectiveDirective: 'script-src',
        originalPolicy: 'default-src \'self\'',
        blockedURI: 'https://evil.com/script.js',
        lineNumber: 10,
        columnNumber: 5,
        sourceFile: 'https://example.com/page.html',
        statusCode: 200,
        disposition: 'enforce'
      }

      // Get the event handler that was registered
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'securitypolicyviolation'
      )?.[1]

      expect(eventHandler).toBeDefined()

      // Simulate violation event
      if (eventHandler) {
        eventHandler(mockViolationEvent)
      }

      const violations = cspMonitoringService.getViolations()
      expect(violations).toHaveLength(1)
      expect(violations[0]).toMatchObject({
        documentURI: 'https://example.com',
        violatedDirective: 'script-src',
        blockedURI: 'https://evil.com/script.js'
      })
    })

    it('should dispatch custom event for violations', () => {
      const mockViolationEvent = {
        documentURI: 'https://example.com',
        referrer: '',
        violatedDirective: 'style-src',
        effectiveDirective: 'style-src',
        originalPolicy: 'default-src \'self\'',
        blockedURI: 'https://evil.com/style.css',
        statusCode: 200,
        disposition: 'enforce'
      }

      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'securitypolicyviolation'
      )?.[1]

      if (eventHandler) {
        eventHandler(mockViolationEvent)
      }

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'csp-violation',
          detail: expect.objectContaining({
            violatedDirective: 'style-src',
            blockedURI: 'https://evil.com/style.css'
          })
        })
      )
    })

    it('should report violations to server endpoint', async () => {
      mockQuerySelector.mockReturnValue({
        getAttribute: () => 'default-src \'self\'; report-uri /api/csp-report'
      })

      mockFetch.mockResolvedValueOnce({ ok: true })

      const mockViolationEvent = {
        documentURI: 'https://example.com',
        referrer: '',
        violatedDirective: 'img-src',
        effectiveDirective: 'img-src',
        originalPolicy: 'default-src \'self\'',
        blockedURI: 'https://evil.com/image.jpg',
        statusCode: 200,
        disposition: 'enforce'
      }

      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'securitypolicyviolation'
      )?.[1]

      if (eventHandler) {
        eventHandler(mockViolationEvent)
      }

      // Wait for async reporting
      await vi.runAllTimersAsync()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/csp-report',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/csp-report'
          },
          body: expect.stringContaining('img-src')
        })
      )
    })
  })

  describe('violation storage and retrieval', () => {
    it('should store violations with timestamp', () => {
      const testDate = new Date('2023-01-01T12:00:00Z')
      vi.setSystemTime(testDate)

      const mockViolationEvent = {
        documentURI: 'https://example.com',
        referrer: '',
        violatedDirective: 'connect-src',
        effectiveDirective: 'connect-src',
        originalPolicy: 'default-src \'self\'',
        blockedURI: 'https://api.evil.com',
        statusCode: 200,
        disposition: 'enforce'
      }

      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'securitypolicyviolation'
      )?.[1]

      if (eventHandler) {
        eventHandler(mockViolationEvent)
      }

      const violations = cspMonitoringService.getViolations()
      expect(violations[0].timestamp).toEqual(testDate)
    })

    it('should limit stored violations to maximum', () => {
      // Create more violations than the limit (1000)
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'securitypolicyviolation'
      )?.[1]

      if (eventHandler) {
        // Simulate 1005 violations
        for (let i = 0; i < 1005; i++) {
          eventHandler({
            documentURI: 'https://example.com',
            referrer: '',
            violatedDirective: 'script-src',
            effectiveDirective: 'script-src',
            originalPolicy: 'default-src \'self\'',
            blockedURI: `https://evil.com/script${i}.js`,
            statusCode: 200,
            disposition: 'enforce'
          })
        }
      }

      const violations = cspMonitoringService.getViolations()
      expect(violations).toHaveLength(1000) // Should be limited to 1000
    })

    it('should retrieve violations in time range', () => {
      const startDate = new Date('2023-01-01T10:00:00Z')
      const middleDate = new Date('2023-01-01T12:00:00Z')
      const endDate = new Date('2023-01-01T14:00:00Z')

      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'securitypolicyviolation'
      )?.[1]

      if (eventHandler) {
        // Violation before range
        vi.setSystemTime(new Date('2023-01-01T09:00:00Z'))
        eventHandler({
          documentURI: 'https://example.com',
          referrer: '',
          violatedDirective: 'script-src',
          effectiveDirective: 'script-src',
          originalPolicy: 'default-src \'self\'',
          blockedURI: 'https://evil.com/before.js',
          statusCode: 200,
          disposition: 'enforce'
        })

        // Violation in range
        vi.setSystemTime(middleDate)
        eventHandler({
          documentURI: 'https://example.com',
          referrer: '',
          violatedDirective: 'script-src',
          effectiveDirective: 'script-src',
          originalPolicy: 'default-src \'self\'',
          blockedURI: 'https://evil.com/during.js',
          statusCode: 200,
          disposition: 'enforce'
        })

        // Violation after range
        vi.setSystemTime(new Date('2023-01-01T15:00:00Z'))
        eventHandler({
          documentURI: 'https://example.com',
          referrer: '',
          violatedDirective: 'script-src',
          effectiveDirective: 'script-src',
          originalPolicy: 'default-src \'self\'',
          blockedURI: 'https://evil.com/after.js',
          statusCode: 200,
          disposition: 'enforce'
        })
      }

      const violationsInRange = cspMonitoringService.getViolationsInRange(startDate, endDate)
      expect(violationsInRange).toHaveLength(1)
      expect(violationsInRange[0].blockedURI).toBe('https://evil.com/during.js')
    })
  })

  describe('report generation', () => {
    it('should generate comprehensive violation report', () => {
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'securitypolicyviolation'
      )?.[1]

      if (eventHandler) {
        // Add multiple violations
        eventHandler({
          documentURI: 'https://example.com',
          referrer: '',
          violatedDirective: 'script-src',
          effectiveDirective: 'script-src',
          originalPolicy: 'default-src \'self\'',
          blockedURI: 'https://evil.com/script1.js',
          statusCode: 200,
          disposition: 'enforce'
        })

        eventHandler({
          documentURI: 'https://example.com',
          referrer: '',
          violatedDirective: 'script-src',
          effectiveDirective: 'script-src',
          originalPolicy: 'default-src \'self\'',
          blockedURI: 'https://evil.com/script2.js',
          statusCode: 200,
          disposition: 'enforce'
        })

        eventHandler({
          documentURI: 'https://example.com',
          referrer: '',
          violatedDirective: 'style-src',
          effectiveDirective: 'style-src',
          originalPolicy: 'default-src \'self\'',
          blockedURI: 'https://evil.com/style.css',
          statusCode: 200,
          disposition: 'enforce'
        })
      }

      const report = cspMonitoringService.generateReport()

      expect(report.totalViolations).toBe(3)
      expect(report.uniqueViolations).toBe(3)
      expect(report.mostCommonViolations).toHaveLength(2)
      expect(report.mostCommonViolations[0]).toEqual({
        directive: 'script-src',
        count: 2
      })
      expect(report.mostCommonViolations[1]).toEqual({
        directive: 'style-src',
        count: 1
      })
    })

    it('should generate statistics', () => {
      const now = new Date('2023-01-01T12:00:00Z')
      vi.setSystemTime(now)

      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'securitypolicyviolation'
      )?.[1]

      if (eventHandler) {
        // Today's violation
        eventHandler({
          documentURI: 'https://example.com',
          referrer: '',
          violatedDirective: 'script-src',
          effectiveDirective: 'script-src',
          originalPolicy: 'default-src \'self\'',
          blockedURI: 'https://evil.com/today.js',
          statusCode: 200,
          disposition: 'enforce'
        })

        // This hour's violation
        eventHandler({
          documentURI: 'https://example.com',
          referrer: '',
          violatedDirective: 'img-src',
          effectiveDirective: 'img-src',
          originalPolicy: 'default-src \'self\'',
          blockedURI: 'https://evil.com/image.jpg',
          statusCode: 200,
          disposition: 'enforce'
        })
      }

      const stats = cspMonitoringService.getStatistics()

      expect(stats.totalViolations).toBe(2)
      expect(stats.violationsToday).toBe(2)
      expect(stats.violationsThisHour).toBe(2)
      expect(stats.topViolatedDirectives).toContain('script-src')
      expect(stats.topViolatedDirectives).toContain('img-src')
      expect(stats.topBlockedURIs).toContain('https://evil.com/today.js')
      expect(stats.topBlockedURIs).toContain('https://evil.com/image.jpg')
    })
  })

  describe('CSP effectiveness analysis', () => {
    it('should analyze CSP effectiveness with good policy', () => {
      mockQuerySelector.mockReturnValue({
        getAttribute: () => 'default-src \'self\'; script-src \'self\'; style-src \'self\'; img-src \'self\''
      })

      const analysis = cspMonitoringService.analyzeCSPEffectiveness()

      expect(analysis.score).toBeGreaterThan(80)
      expect(analysis.issues).toHaveLength(0)
      expect(analysis.recommendations).toHaveLength(0)
    })

    it('should detect unsafe CSP directives', () => {
      mockQuerySelector.mockReturnValue({
        getAttribute: () => 'default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; style-src *'
      })

      const analysis = cspMonitoringService.analyzeCSPEffectiveness()

      expect(analysis.score).toBeLessThan(50)
      expect(analysis.issues).toContain('unsafe-inline directive found')
      expect(analysis.issues).toContain('unsafe-eval directive found')
      expect(analysis.issues).toContain('Wildcard (*) directive found')
      expect(analysis.recommendations).toContain('Remove unsafe-inline and use nonces or hashes')
      expect(analysis.recommendations).toContain('Remove unsafe-eval directive')
      expect(analysis.recommendations).toContain('Replace wildcards with specific domains')
    })

    it('should detect missing CSP', () => {
      mockQuerySelector.mockReturnValue(null)

      const analysis = cspMonitoringService.analyzeCSPEffectiveness()

      expect(analysis.score).toBe(50)
      expect(analysis.issues).toContain('No CSP meta tag found')
      expect(analysis.recommendations).toContain('Add Content-Security-Policy meta tag')
    })
  })

  describe('data export', () => {
    it('should export violations as CSV', () => {
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'securitypolicyviolation'
      )?.[1]

      if (eventHandler) {
        eventHandler({
          documentURI: 'https://example.com',
          referrer: '',
          violatedDirective: 'script-src',
          effectiveDirective: 'script-src',
          originalPolicy: 'default-src \'self\'',
          blockedURI: 'https://evil.com/script.js',
          lineNumber: 10,
          statusCode: 200,
          disposition: 'enforce'
        })
      }

      const csv = cspMonitoringService.exportViolationsCSV()

      expect(csv).toContain('Timestamp,Document URI,Violated Directive')
      expect(csv).toContain('https://example.com')
      expect(csv).toContain('script-src')
      expect(csv).toContain('https://evil.com/script.js')
    })
  })

  describe('violation clearing', () => {
    it('should clear all violations', () => {
      const eventHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'securitypolicyviolation'
      )?.[1]

      if (eventHandler) {
        eventHandler({
          documentURI: 'https://example.com',
          referrer: '',
          violatedDirective: 'script-src',
          effectiveDirective: 'script-src',
          originalPolicy: 'default-src \'self\'',
          blockedURI: 'https://evil.com/script.js',
          statusCode: 200,
          disposition: 'enforce'
        })
      }

      expect(cspMonitoringService.getViolations()).toHaveLength(1)

      cspMonitoringService.clearViolations()

      expect(cspMonitoringService.getViolations()).toHaveLength(0)
    })
  })
})
