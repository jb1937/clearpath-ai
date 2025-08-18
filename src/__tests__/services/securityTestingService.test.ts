import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { securityTestingService } from '../../services/securityTestingService'

// Mock the dataSecurity service
const mockDataSecurityService = {
  sanitizeInput: vi.fn(),
  sanitizeHtml: vi.fn(),
  validateInput: vi.fn()
}

vi.mock('../../services/dataSecurity', () => ({
  dataSecurityService: mockDataSecurityService
}))

// Mock the config
const mockConfig = {
  rateLimitRequests: 10,
  rateLimitWindowMs: 60000,
  maxInputLength: 1000,
  isProduction: false,
  apiUrl: 'http://localhost:3000'
}

const mockCheckRateLimit = vi.fn()

vi.mock('../../config/env', () => ({
  config: mockConfig,
  checkRateLimit: mockCheckRateLimit
}))

// Mock DOM methods
const mockQuerySelector = vi.fn()
const mockQuerySelectorAll = vi.fn()
Object.defineProperty(document, 'querySelector', { value: mockQuerySelector })
Object.defineProperty(document, 'querySelectorAll', { value: mockQuerySelectorAll })

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    protocol: 'https:',
    href: 'https://example.com'
  },
  writable: true
})

describe('SecurityTestingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('runSecurityScan', () => {
    it('should run comprehensive security scan', async () => {
      // Mock CSP meta tag
      mockQuerySelector.mockReturnValue({
        getAttribute: () => 'default-src \'self\'; script-src \'self\'; style-src \'self\''
      })

      // Mock forms
      mockQuerySelectorAll.mockReturnValue([])

      // Mock sanitization methods
      mockDataSecurityService.sanitizeInput.mockImplementation((input: string) => 
        input.replace(/<script>/g, '').replace(/javascript:/g, '')
      )
      mockDataSecurityService.sanitizeHtml.mockImplementation((html: string) => 
        html.replace(/<script>/g, '').replace(/onerror=/g, '')
      )
      mockDataSecurityService.validateInput.mockImplementation((input: string) => 
        !input.includes('<script>') && input.length <= 1000
      )

      // Mock rate limiting
      let callCount = 0
      mockCheckRateLimit.mockImplementation(() => {
        callCount++
        return callCount <= 10 // Allow first 10 calls, then block
      })

      const report = await securityTestingService.runSecurityScan()

      expect(report).toBeDefined()
      expect(report.totalTests).toBeGreaterThan(0)
      expect(report.overallScore).toBeGreaterThanOrEqual(0)
      expect(report.overallScore).toBeLessThanOrEqual(100)
      expect(report.results).toBeInstanceOf(Array)
      expect(report.timestamp).toBeInstanceOf(Date)
    })

    it('should detect XSS vulnerabilities', async () => {
      // Mock vulnerable sanitization (doesn't remove scripts)
      mockDataSecurityService.sanitizeInput.mockImplementation((input: string) => input)
      mockDataSecurityService.validateInput.mockReturnValue(true)

      mockQuerySelector.mockReturnValue({
        getAttribute: () => 'default-src \'self\''
      })
      mockQuerySelectorAll.mockReturnValue([])

      const report = await securityTestingService.runSecurityScan()

      // Should detect XSS vulnerabilities
      const xssTests = report.results.filter(r => 
        r.testName.includes('XSS') && !r.passed
      )
      expect(xssTests.length).toBeGreaterThan(0)
    })

    it('should detect missing CSP', async () => {
      // Mock no CSP meta tag
      mockQuerySelector.mockReturnValue(null)
      mockQuerySelectorAll.mockReturnValue([])

      mockDataSecurityService.sanitizeInput.mockImplementation((input: string) => '')
      mockDataSecurityService.validateInput.mockReturnValue(false)

      const report = await securityTestingService.runSecurityScan()

      const cspTest = report.results.find(r => r.testName === 'CSP Meta Tag Presence')
      expect(cspTest).toBeDefined()
      expect(cspTest?.passed).toBe(false)
      expect(cspTest?.severity).toBe('high')
    })
  })

  describe('runPenetrationTest', () => {
    it('should simulate penetration testing', async () => {
      // Mock secure sanitization
      mockDataSecurityService.sanitizeInput.mockImplementation((input: string) => 
        input.replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '')
      )

      // Mock CSP with frame protection
      mockQuerySelector.mockReturnValue({
        getAttribute: () => 'default-src \'self\'; frame-ancestors \'none\''
      })

      // Mock forms without CSRF protection
      mockQuerySelectorAll.mockReturnValue([
        { querySelector: () => null } // No CSRF token
      ])

      let callCount = 0
      mockCheckRateLimit.mockImplementation(() => {
        callCount++
        return callCount <= 5 // Block after 5 calls to simulate rate limiting
      })

      const report = await securityTestingService.runPenetrationTest()

      expect(report).toBeDefined()
      expect(report.totalTests).toBeGreaterThan(0)
      expect(report.results).toBeInstanceOf(Array)

      // Should test XSS resistance
      const xssTests = report.results.filter(r => 
        r.testName.includes('XSS Vector Resistance')
      )
      expect(xssTests.length).toBeGreaterThan(0)
    })

    it('should test brute force protection', async () => {
      // Mock rate limiting that blocks after 3 requests
      let callCount = 0
      mockCheckRateLimit.mockImplementation(() => {
        callCount++
        return callCount <= 3
      })

      mockQuerySelector.mockReturnValue({
        getAttribute: () => 'default-src \'self\''
      })
      mockQuerySelectorAll.mockReturnValue([])

      const report = await securityTestingService.runPenetrationTest()

      const bruteForceTest = report.results.find(r => 
        r.testName === 'Brute Force Protection'
      )
      expect(bruteForceTest).toBeDefined()
      expect(bruteForceTest?.passed).toBe(true)
      expect(bruteForceTest?.details?.requestsBlocked).toBeGreaterThan(0)
    })
  })

  describe('security test categories', () => {
    it('should test input validation comprehensively', async () => {
      // Mock proper input validation
      mockDataSecurityService.sanitizeInput.mockImplementation((input: string) => {
        if (input.includes('<script>')) return ''
        if (input.includes('javascript:')) return ''
        return input
      })
      mockDataSecurityService.validateInput.mockImplementation((input: string) => {
        return !input.includes('<script>') && 
               !input.includes('javascript:') && 
               input.length <= 1000
      })

      mockQuerySelector.mockReturnValue({
        getAttribute: () => 'default-src \'self\''
      })
      mockQuerySelectorAll.mockReturnValue([])

      const report = await securityTestingService.runSecurityScan()

      const inputTests = report.results.filter(r => 
        r.testName.includes('Payload') || r.testName.includes('Input')
      )
      expect(inputTests.length).toBeGreaterThan(5) // Should test multiple payloads
    })

    it('should validate CSP directives', async () => {
      // Mock CSP with unsafe directives
      mockQuerySelector.mockReturnValue({
        getAttribute: () => 'default-src \'self\'; script-src \'self\' \'unsafe-eval\' \'unsafe-inline\''
      })
      mockQuerySelectorAll.mockReturnValue([])

      mockDataSecurityService.sanitizeInput.mockReturnValue('')
      mockDataSecurityService.validateInput.mockReturnValue(false)

      const report = await securityTestingService.runSecurityScan()

      const unsafeEvalTest = report.results.find(r => 
        r.testName === 'CSP Unsafe Pattern: unsafe-eval'
      )
      const unsafeInlineTest = report.results.find(r => 
        r.testName === 'CSP Unsafe Pattern: unsafe-inline'
      )

      expect(unsafeEvalTest?.passed).toBe(false)
      expect(unsafeInlineTest?.passed).toBe(false)
    })

    it('should test HTTPS enforcement', async () => {
      // Test HTTP in production (should fail)
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', href: 'http://example.com' },
        writable: true
      })

      // Mock production config
      Object.defineProperty(mockConfig, 'isProduction', { value: true, writable: true })
      Object.defineProperty(mockConfig, 'apiUrl', { value: 'http://api.example.com', writable: true })

      mockQuerySelector.mockReturnValue({
        getAttribute: () => 'default-src \'self\''
      })
      mockQuerySelectorAll.mockReturnValue([])

      mockDataSecurityService.sanitizeInput.mockReturnValue('')
      mockDataSecurityService.validateInput.mockReturnValue(false)

      const report = await securityTestingService.runSecurityScan()

      const httpsTest = report.results.find(r => 
        r.testName === 'HTTPS Enforcement'
      )
      const apiHttpsTest = report.results.find(r => 
        r.testName === 'API HTTPS Enforcement'
      )

      expect(httpsTest?.passed).toBe(false)
      expect(httpsTest?.severity).toBe('critical')
      expect(apiHttpsTest?.passed).toBe(false)
    })
  })

  describe('report generation', () => {
    it('should calculate security scores correctly', async () => {
      mockQuerySelector.mockReturnValue({
        getAttribute: () => 'default-src \'self\'; script-src \'self\'; style-src \'self\''
      })
      mockQuerySelectorAll.mockReturnValue([])

      mockDataSecurityService.sanitizeInput.mockImplementation((input: string) => '')
      mockDataSecurityService.validateInput.mockImplementation(() => false)

      const report = await securityTestingService.runSecurityScan()

      expect(report.overallScore).toBeGreaterThanOrEqual(0)
      expect(report.overallScore).toBeLessThanOrEqual(100)
      expect(report.passedTests + report.failedTests).toBe(report.totalTests)
      expect(report.criticalIssues + report.highIssues + report.mediumIssues + report.lowIssues)
        .toBe(report.failedTests)
    })

    it('should categorize issues by severity', async () => {
      // Mock scenario with various severity issues
      mockQuerySelector.mockReturnValue(null) // Missing CSP (high severity)
      mockQuerySelectorAll.mockReturnValue([])

      mockDataSecurityService.sanitizeInput.mockImplementation((input: string) => input) // Vulnerable
      mockDataSecurityService.validateInput.mockReturnValue(true)

      const report = await securityTestingService.runSecurityScan()

      expect(report.criticalIssues).toBeGreaterThanOrEqual(0)
      expect(report.highIssues).toBeGreaterThan(0) // Should have high severity issues
      expect(report.mediumIssues).toBeGreaterThanOrEqual(0)
      expect(report.lowIssues).toBeGreaterThanOrEqual(0)
    })
  })
})
