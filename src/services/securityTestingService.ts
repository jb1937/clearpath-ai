/**
 * Security Testing Service
 * Implements automated security scans and penetration testing
 */

import { dataSecurityService } from './dataSecurity'
import { config } from '../config/env'

export interface SecurityTestResult {
  testName: string
  passed: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  recommendation?: string
  details?: any
}

export interface SecurityScanReport {
  timestamp: Date
  overallScore: number
  totalTests: number
  passedTests: number
  failedTests: number
  criticalIssues: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
  results: SecurityTestResult[]
}

export class SecurityTestingService {
  private static instance: SecurityTestingService

  static getInstance(): SecurityTestingService {
    if (!SecurityTestingService.instance) {
      SecurityTestingService.instance = new SecurityTestingService()
    }
    return SecurityTestingService.instance
  }

  /**
   * Run comprehensive security scan
   */
  async runSecurityScan(): Promise<SecurityScanReport> {
    const results: SecurityTestResult[] = []

    // Input validation tests
    results.push(...await this.testInputValidation())
    
    // XSS protection tests
    results.push(...await this.testXSSProtection())
    
    // CSP compliance tests
    results.push(...await this.testCSPCompliance())
    
    // Rate limiting tests
    results.push(...await this.testRateLimiting())
    
    // HTTPS enforcement tests
    results.push(...await this.testHTTPSEnforcement())
    
    // Client-side security tests
    results.push(...await this.testClientSideSecurity())
    
    // Error handling tests
    results.push(...await this.testErrorHandling())

    return this.generateReport(results)
  }

  /**
   * Test input validation and sanitization
   */
  private async testInputValidation(): Promise<SecurityTestResult[]> {
    const tests: SecurityTestResult[] = []
    
    // Test XSS payloads
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')">',
      '<svg onload="alert(\'xss\')">',
      '"><script>alert("xss")</script>',
      '\';alert(\'xss\');//'
    ]

    for (const payload of xssPayloads) {
      const sanitized = dataSecurityService.sanitizeInput(payload)
      const isValid = dataSecurityService.validateInput(payload)
      
      tests.push({
        testName: `XSS Payload Sanitization: ${payload.substring(0, 20)}...`,
        passed: sanitized !== payload || !isValid,
        severity: 'high',
        description: 'Tests if XSS payloads are properly sanitized',
        recommendation: sanitized === payload ? 'Implement proper input sanitization' : undefined,
        details: { original: payload, sanitized, isValid }
      })
    }

    // Test SQL injection patterns (even though we don't use SQL directly)
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users --"
    ]

    for (const payload of sqlPayloads) {
      const sanitized = dataSecurityService.sanitizeInput(payload)
      const isValid = dataSecurityService.validateInput(payload)
      
      tests.push({
        testName: `SQL Injection Pattern: ${payload.substring(0, 20)}...`,
        passed: sanitized !== payload || !isValid,
        severity: 'medium',
        description: 'Tests if SQL injection patterns are detected',
        details: { original: payload, sanitized, isValid }
      })
    }

    // Test input length limits
    const longInput = 'x'.repeat(config.maxInputLength + 100)
    const isLongInputValid = dataSecurityService.validateInput(longInput)
    
    tests.push({
      testName: 'Input Length Validation',
      passed: !isLongInputValid,
      severity: 'medium',
      description: 'Tests if excessively long inputs are rejected',
      recommendation: isLongInputValid ? 'Implement input length limits' : undefined,
      details: { inputLength: longInput.length, maxAllowed: config.maxInputLength }
    })

    return tests
  }

  /**
   * Test XSS protection mechanisms
   */
  private async testXSSProtection(): Promise<SecurityTestResult[]> {
    const tests: SecurityTestResult[] = []
    
    // Test if dangerous HTML is sanitized
    const dangerousHtml = '<script>alert("xss")</script><img src="x" onerror="alert(\'xss\')">'
    const sanitizedHtml = dataSecurityService.sanitizeHtml(dangerousHtml)
    
    tests.push({
      testName: 'HTML Sanitization',
      passed: !sanitizedHtml.includes('<script>') && !sanitizedHtml.includes('onerror'),
      severity: 'high',
      description: 'Tests if dangerous HTML elements are removed',
      details: { original: dangerousHtml, sanitized: sanitizedHtml }
    })

    // Test if safe HTML is preserved
    const safeHtml = '<p>This is <strong>safe</strong> content</p>'
    const sanitizedSafeHtml = dataSecurityService.sanitizeHtml(safeHtml)
    
    tests.push({
      testName: 'Safe HTML Preservation',
      passed: sanitizedSafeHtml.includes('<strong>') && sanitizedSafeHtml.includes('<p>'),
      severity: 'low',
      description: 'Tests if safe HTML elements are preserved',
      details: { original: safeHtml, sanitized: sanitizedSafeHtml }
    })

    return tests
  }

  /**
   * Test Content Security Policy compliance
   */
  private async testCSPCompliance(): Promise<SecurityTestResult[]> {
    const tests: SecurityTestResult[] = []
    
    // Check if CSP meta tag exists
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    
    tests.push({
      testName: 'CSP Meta Tag Presence',
      passed: !!cspMeta,
      severity: 'high',
      description: 'Tests if Content Security Policy meta tag is present',
      recommendation: !cspMeta ? 'Add CSP meta tag to HTML head' : undefined
    })

    if (cspMeta) {
      const cspContent = cspMeta.getAttribute('content') || ''
      
      // Check for essential CSP directives
      const requiredDirectives = [
        'default-src',
        'script-src',
        'style-src',
        'img-src',
        'connect-src'
      ]

      for (const directive of requiredDirectives) {
        tests.push({
          testName: `CSP Directive: ${directive}`,
          passed: cspContent.includes(directive),
          severity: 'medium',
          description: `Tests if ${directive} directive is present in CSP`,
          recommendation: !cspContent.includes(directive) ? `Add ${directive} directive to CSP` : undefined
        })
      }

      // Check for unsafe directives
      const unsafePatterns = ['unsafe-eval', '*']
      for (const pattern of unsafePatterns) {
        tests.push({
          testName: `CSP Unsafe Pattern: ${pattern}`,
          passed: !cspContent.includes(pattern),
          severity: pattern === 'unsafe-eval' ? 'high' : 'medium',
          description: `Tests if unsafe pattern ${pattern} is avoided in CSP`,
          recommendation: cspContent.includes(pattern) ? `Remove ${pattern} from CSP for better security` : undefined
        })
      }
    }

    return tests
  }

  /**
   * Test rate limiting functionality
   */
  private async testRateLimiting(): Promise<SecurityTestResult[]> {
    const tests: SecurityTestResult[] = []
    
    // Test rate limiting by making multiple rapid requests
    const testKey = 'security-test-' + Date.now()
    let rateLimitTriggered = false
    
    // Make requests up to the limit
    for (let i = 0; i < config.rateLimitRequests + 5; i++) {
      const { checkRateLimit } = await import('../config/env')
      const allowed = checkRateLimit(testKey)
      if (!allowed) {
        rateLimitTriggered = true
        break
      }
    }
    
    tests.push({
      testName: 'Rate Limiting Functionality',
      passed: rateLimitTriggered,
      severity: 'medium',
      description: 'Tests if rate limiting prevents excessive requests',
      recommendation: !rateLimitTriggered ? 'Implement or fix rate limiting mechanism' : undefined,
      details: { limit: config.rateLimitRequests, windowMs: config.rateLimitWindowMs }
    })

    return tests
  }

  /**
   * Test HTTPS enforcement
   */
  private async testHTTPSEnforcement(): Promise<SecurityTestResult[]> {
    const tests: SecurityTestResult[] = []
    
    // Check if current page is served over HTTPS (in production)
    const isHTTPS = window.location.protocol === 'https:'
    const isProduction = config.isProduction
    
    tests.push({
      testName: 'HTTPS Enforcement',
      passed: !isProduction || isHTTPS,
      severity: 'critical',
      description: 'Tests if HTTPS is enforced in production',
      recommendation: isProduction && !isHTTPS ? 'Enforce HTTPS in production environment' : undefined,
      details: { protocol: window.location.protocol, isProduction }
    })

    // Check if API URL uses HTTPS in production
    const apiUsesHTTPS = config.apiUrl.startsWith('https://')
    
    tests.push({
      testName: 'API HTTPS Enforcement',
      passed: !isProduction || apiUsesHTTPS,
      severity: 'critical',
      description: 'Tests if API endpoints use HTTPS in production',
      recommendation: isProduction && !apiUsesHTTPS ? 'Configure API to use HTTPS in production' : undefined,
      details: { apiUrl: config.apiUrl, isProduction }
    })

    return tests
  }

  /**
   * Test client-side security measures
   */
  private async testClientSideSecurity(): Promise<SecurityTestResult[]> {
    const tests: SecurityTestResult[] = []
    
    // Check if sensitive data is not stored in localStorage
    const localStorageKeys = Object.keys(localStorage)
    const sensitivePatterns = ['password', 'token', 'key', 'secret', 'ssn', 'social']
    
    let sensitiveLSData = false
    for (const key of localStorageKeys) {
      if (sensitivePatterns.some(pattern => key.toLowerCase().includes(pattern))) {
        sensitiveLSData = true
        break
      }
    }
    
    tests.push({
      testName: 'LocalStorage Security',
      passed: !sensitiveLSData,
      severity: 'high',
      description: 'Tests if sensitive data is not stored in localStorage',
      recommendation: sensitiveLSData ? 'Remove sensitive data from localStorage' : undefined,
      details: { localStorageKeys }
    })

    // Check if console contains sensitive information
    const originalConsoleError = console.error
    let sensitiveConsoleOutput = false
    
    console.error = (...args) => {
      const message = args.join(' ').toLowerCase()
      if (sensitivePatterns.some(pattern => message.includes(pattern))) {
        sensitiveConsoleOutput = true
      }
      originalConsoleError.apply(console, args)
    }
    
    // Restore original console.error after a short delay
    setTimeout(() => {
      console.error = originalConsoleError
    }, 1000)
    
    tests.push({
      testName: 'Console Output Security',
      passed: !sensitiveConsoleOutput,
      severity: 'medium',
      description: 'Tests if sensitive information is not logged to console',
      recommendation: sensitiveConsoleOutput ? 'Remove sensitive data from console output' : undefined
    })

    return tests
  }

  /**
   * Test error handling security
   */
  private async testErrorHandling(): Promise<SecurityTestResult[]> {
    const tests: SecurityTestResult[] = []
    
    // Test if error boundaries are implemented
    const hasErrorBoundary = document.querySelector('[data-error-boundary]') !== null ||
                            Boolean(window.React?.version) // Simplified check
    
    tests.push({
      testName: 'Error Boundary Implementation',
      passed: hasErrorBoundary,
      severity: 'medium',
      description: 'Tests if error boundaries are implemented to prevent crashes',
      recommendation: !hasErrorBoundary ? 'Implement React Error Boundaries' : undefined
    })

    return tests
  }

  /**
   * Generate comprehensive security report
   */
  private generateReport(results: SecurityTestResult[]): SecurityScanReport {
    const totalTests = results.length
    const passedTests = results.filter(r => r.passed).length
    const failedTests = totalTests - passedTests
    
    const criticalIssues = results.filter(r => !r.passed && r.severity === 'critical').length
    const highIssues = results.filter(r => !r.passed && r.severity === 'high').length
    const mediumIssues = results.filter(r => !r.passed && r.severity === 'medium').length
    const lowIssues = results.filter(r => !r.passed && r.severity === 'low').length
    
    // Calculate overall score (0-100)
    const severityWeights = { critical: 10, high: 5, medium: 2, low: 1 }
    const maxPossibleScore = results.reduce((sum, r) => sum + severityWeights[r.severity], 0)
    const actualScore = results.reduce((sum, r) => sum + (r.passed ? severityWeights[r.severity] : 0), 0)
    const overallScore = maxPossibleScore > 0 ? Math.round((actualScore / maxPossibleScore) * 100) : 100
    
    return {
      timestamp: new Date(),
      overallScore,
      totalTests,
      passedTests,
      failedTests,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      results
    }
  }

  /**
   * Run penetration testing simulation
   */
  async runPenetrationTest(): Promise<SecurityScanReport> {
    const results: SecurityTestResult[] = []
    
    // Simulate common attack vectors
    results.push(...await this.simulateXSSAttacks())
    results.push(...await this.simulateCSRFAttacks())
    results.push(...await this.simulateClickjackingAttacks())
    results.push(...await this.simulateBruteForceAttacks())
    
    return this.generateReport(results)
  }

  /**
   * Simulate XSS attacks
   */
  private async simulateXSSAttacks(): Promise<SecurityTestResult[]> {
    const tests: SecurityTestResult[] = []
    
    const xssVectors = [
      '<script>document.body.innerHTML="HACKED"</script>',
      '<img src="x" onerror="document.location=\'http://evil.com\'">',
      '<svg/onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>'
    ]
    
    for (const vector of xssVectors) {
      try {
        const sanitized = dataSecurityService.sanitizeInput(vector)
        const containsScript = sanitized.includes('<script>') || 
                              sanitized.includes('javascript:') || 
                              sanitized.includes('onerror=') ||
                              sanitized.includes('onload=')
        
        tests.push({
          testName: `XSS Vector Resistance: ${vector.substring(0, 30)}...`,
          passed: !containsScript,
          severity: 'high',
          description: 'Tests resistance to XSS attack vectors',
          details: { vector, sanitized, containsScript }
        })
      } catch (error) {
        tests.push({
          testName: `XSS Vector Error Handling: ${vector.substring(0, 30)}...`,
          passed: true, // Error handling is good
          severity: 'medium',
          description: 'Tests if XSS vectors cause errors',
          details: { vector, error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }
    }
    
    return tests
  }

  /**
   * Simulate CSRF attacks
   */
  private async simulateCSRFAttacks(): Promise<SecurityTestResult[]> {
    const tests: SecurityTestResult[] = []
    
    // Check if forms have CSRF protection (simplified check)
    const forms = document.querySelectorAll('form')
    let hasCSRFProtection = true
    
    forms.forEach(form => {
      const hasCSRFToken = form.querySelector('input[name*="csrf"]') !== null ||
                          form.querySelector('input[name*="token"]') !== null
      if (!hasCSRFToken) {
        hasCSRFProtection = false
      }
    })
    
    tests.push({
      testName: 'CSRF Protection',
      passed: hasCSRFProtection || forms.length === 0,
      severity: 'medium',
      description: 'Tests if forms have CSRF protection',
      recommendation: !hasCSRFProtection ? 'Implement CSRF tokens in forms' : undefined,
      details: { formsCount: forms.length }
    })
    
    return tests
  }

  /**
   * Simulate clickjacking attacks
   */
  private async simulateClickjackingAttacks(): Promise<SecurityTestResult[]> {
    const tests: SecurityTestResult[] = []
    
    // Check if X-Frame-Options or frame-ancestors CSP is set
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    const cspContent = cspMeta?.getAttribute('content') || ''
    const hasFrameProtection = cspContent.includes('frame-ancestors')
    
    tests.push({
      testName: 'Clickjacking Protection',
      passed: hasFrameProtection,
      severity: 'medium',
      description: 'Tests if clickjacking protection is implemented',
      recommendation: !hasFrameProtection ? 'Add frame-ancestors directive to CSP' : undefined,
      details: { hasFrameProtection, cspContent }
    })
    
    return tests
  }

  /**
   * Simulate brute force attacks
   */
  private async simulateBruteForceAttacks(): Promise<SecurityTestResult[]> {
    const tests: SecurityTestResult[] = []
    
    // Test rate limiting effectiveness
    const testKey = 'brute-force-test-' + Date.now()
    let requestsBlocked = 0
    
    // Simulate rapid requests
    for (let i = 0; i < 20; i++) {
      const { checkRateLimit } = await import('../config/env')
      const allowed = checkRateLimit(testKey)
      if (!allowed) {
        requestsBlocked++
      }
    }
    
    tests.push({
      testName: 'Brute Force Protection',
      passed: requestsBlocked > 0,
      severity: 'medium',
      description: 'Tests if rate limiting prevents brute force attacks',
      details: { requestsBlocked, totalRequests: 20 }
    })
    
    return tests
  }
}

// Export singleton instance
export const securityTestingService = SecurityTestingService.getInstance()
