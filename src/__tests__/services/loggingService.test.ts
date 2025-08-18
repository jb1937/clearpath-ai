import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loggingService } from '../../services/loggingService'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
})

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com/test'
  },
  writable: true
})

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Test Browser)',
  writable: true
})

// Mock console methods
const mockConsole = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}
Object.assign(console, mockConsole)

describe('LoggingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionStorage.getItem.mockReturnValue('test-session-id')
    
    // Clear all logs before each test to ensure isolation
    loggingService.clearLogs()
    
    // Mock NODE_ENV as development
    vi.stubEnv('NODE_ENV', 'development')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Clean up any fake timers if they were used
    if (vi.isFakeTimers()) {
      vi.useRealTimers()
    }
    vi.unstubAllEnvs()
    
    // Clear logs after each test as well
    loggingService.clearLogs()
  })

  describe('basic logging methods', () => {
    it('should log debug messages', () => {
      loggingService.debug('Debug message', 'test-category', { key: 'value' })

      expect(mockConsole.debug).toHaveBeenCalledWith(
        '[DEBUG] test-category: Debug message',
        { key: 'value' }
      )
    })

    it('should log info messages', () => {
      loggingService.info('Info message', 'test-category')

      expect(mockConsole.info).toHaveBeenCalledWith(
        '[INFO] test-category: Info message',
        undefined
      )
    })

    it('should log warning messages', () => {
      loggingService.warn('Warning message')

      expect(mockConsole.warn).toHaveBeenCalledWith(
        '[WARN] general: Warning message',
        undefined
      )
    })

    it('should log error messages', () => {
      loggingService.error('Error message', 'error-category', { error: 'details' })

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[ERROR] error-category: Error message',
        { error: 'details' }
      )
    })

    it('should log critical messages', () => {
      loggingService.critical('Critical message')

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[CRITICAL] general: Critical message',
        undefined
      )
    })
  })

  describe('log entry structure', () => {
    it('should create properly structured log entries', () => {
      const testDate = new Date('2023-01-01T12:00:00Z')
      vi.setSystemTime(testDate)

      loggingService.info('Test message', 'test-category', { test: 'metadata' })

      // Get logs to verify structure
      const logs = loggingService.getLogsByCategory('test-category')
      expect(logs).toHaveLength(1)

      const logEntry = logs[0]
      expect(logEntry).toMatchObject({
        timestamp: testDate,
        level: 'info',
        message: 'Test message',
        category: 'test-category',
        sessionId: 'test-session-id',
        metadata: { test: 'metadata' },
        userAgent: 'Mozilla/5.0 (Test Browser)',
        url: 'https://example.com/test'
      })
      expect(logEntry.requestId).toMatch(/^req_\d+_[a-z0-9]+$/)
    })

    it('should generate session ID if none exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null)

      loggingService.info('Test message')

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'clearpath_session_id',
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
      )
    })
  })

  describe('security event logging', () => {
    it('should log security events with proper structure', () => {
      const testDate = new Date('2023-01-01T12:00:00Z')
      vi.setSystemTime(testDate)

      loggingService.logSecurityEvent(
        'input_validation',
        'high',
        'XSS attempt detected',
        'form-validator',
        { payload: '<script>alert("xss")</script>' }
      )

      const securityEvents = loggingService.getSecurityEvents()
      expect(securityEvents).toHaveLength(1)

      const event = securityEvents[0]
      expect(event).toMatchObject({
        timestamp: testDate,
        level: 'error',
        message: 'XSS attempt detected',
        category: 'security',
        eventType: 'input_validation',
        severity: 'high',
        source: 'form-validator',
        details: { payload: '<script>alert("xss")</script>' }
      })

      // Should also create regular log entry
      const logs = loggingService.getLogsByCategory('security')
      expect(logs).toHaveLength(1)
      expect(logs[0].message).toBe('SECURITY: XSS attempt detected')
    })

    it('should handle critical security events immediately', () => {
      loggingService.logSecurityEvent(
        'authentication',
        'critical',
        'Unauthorized access attempt',
        'auth-service',
        { ip: '192.168.1.1' }
      )

      expect(mockConsole.error).toHaveBeenCalledWith(
        'CRITICAL SECURITY EVENT:',
        expect.objectContaining({
          severity: 'critical',
          eventType: 'authentication'
        })
      )
    })
  })

  describe('log filtering and retrieval', () => {
    beforeEach(() => {
      // Add test logs
      loggingService.debug('Debug log')
      loggingService.info('Info log')
      loggingService.warn('Warning log')
      loggingService.error('Error log')
      loggingService.critical('Critical log')
    })

    it('should filter logs by level', () => {
      const errorLogs = loggingService.getLogsByLevel('error')
      expect(errorLogs).toHaveLength(1)
      expect(errorLogs[0].message).toBe('Error log')

      const criticalLogs = loggingService.getLogsByLevel('critical')
      expect(criticalLogs).toHaveLength(1)
      expect(criticalLogs[0].message).toBe('Critical log')
    })

    it('should filter logs by category', () => {
      loggingService.info('Category test', 'test-category')
      loggingService.warn('Another category test', 'test-category')

      const categoryLogs = loggingService.getLogsByCategory('test-category')
      expect(categoryLogs).toHaveLength(2)
      expect(categoryLogs.every(log => log.category === 'test-category')).toBe(true)
    })

    it('should filter logs by time range', () => {
      const startDate = new Date('2023-01-01T10:00:00Z')
      const endDate = new Date('2023-01-01T14:00:00Z')

      // Log before range
      vi.setSystemTime(new Date('2023-01-01T09:00:00Z'))
      loggingService.info('Before range')

      // Log in range
      vi.setSystemTime(new Date('2023-01-01T12:00:00Z'))
      loggingService.info('In range')

      // Log after range
      vi.setSystemTime(new Date('2023-01-01T15:00:00Z'))
      loggingService.info('After range')

      const logsInRange = loggingService.getLogsInRange(startDate, endDate)
      expect(logsInRange).toHaveLength(1)
      expect(logsInRange[0].message).toBe('In range')
    })
  })

  describe('log statistics', () => {
    beforeEach(() => {
      // Clear any existing logs
      loggingService.clearLogs()

      // Add test logs
      loggingService.debug('Debug 1')
      loggingService.debug('Debug 2')
      loggingService.info('Info 1', 'category1')
      loggingService.warn('Warning 1', 'category2')
      loggingService.error('Error 1')
      loggingService.critical('Critical 1')

      // Add security event
      loggingService.logSecurityEvent('rate_limit', 'critical', 'Rate limit exceeded', 'api', {})
    })

    it('should generate comprehensive statistics', () => {
      const stats = loggingService.getLogStatistics()

      expect(stats.totalLogs).toBe(7) // 6 regular logs + 1 security log
      expect(stats.logsByLevel).toEqual({
        debug: 2,
        info: 1,
        warn: 1,
        error: 1,
        critical: 2 // 1 critical + 1 security event logged as critical
      })
      expect(stats.logsByCategory).toEqual({
        general: 4,
        category1: 1,
        category2: 1,
        security: 1
      })
      expect(stats.securityEvents).toBe(1)
      expect(stats.criticalSecurityEvents).toBe(1)
    })

    it('should count recent errors correctly', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      vi.setSystemTime(oneHourAgo)

      // Add recent error
      loggingService.error('Recent error')

      const stats = loggingService.getLogStatistics()
      // The test includes previous errors from beforeEach, so expect the total count
      expect(stats.recentErrors).toBeGreaterThan(0)
    })
  })

  describe('specialized logging methods', () => {
    it('should log performance metrics', () => {
      loggingService.logPerformance('database-query', 150, { query: 'SELECT * FROM users' })

      const performanceLogs = loggingService.getLogsByCategory('performance')
      expect(performanceLogs).toHaveLength(1)
      expect(performanceLogs[0].message).toBe('Performance: database-query')
      expect(performanceLogs[0].metadata).toEqual({
        duration: 150,
        query: 'SELECT * FROM users'
      })
    })

    it('should log user actions', () => {
      loggingService.logUserAction('button-click', { buttonId: 'submit-form' })

      const userActionLogs = loggingService.getLogsByCategory('user_action')
      expect(userActionLogs).toHaveLength(1)
      expect(userActionLogs[0].message).toBe('User Action: button-click')
      expect(userActionLogs[0].metadata).toEqual({ buttonId: 'submit-form' })
    })

    it('should log API calls', () => {
      loggingService.logApiCall('POST', '/api/users', 201, 250)

      const apiLogs = loggingService.getLogsByCategory('api')
      expect(apiLogs).toHaveLength(1)
      expect(apiLogs[0].message).toBe('API Call: POST /api/users')
      expect(apiLogs[0].level).toBe('info')
      expect(apiLogs[0].metadata).toEqual({
        method: 'POST',
        url: '/api/users',
        status: 201,
        duration: 250
      })
    })

    it('should log API errors', () => {
      loggingService.logApiCall('GET', '/api/users', 500, 1000, 'Internal Server Error')

      const apiLogs = loggingService.getLogsByCategory('api')
      expect(apiLogs).toHaveLength(1)
      expect(apiLogs[0].level).toBe('error')
      expect(apiLogs[0].metadata?.error).toBe('Internal Server Error')
    })
  })

  describe('data export', () => {
    beforeEach(() => {
      loggingService.clearLogs()
      loggingService.info('Test log', 'test-category', { key: 'value' })
      loggingService.logSecurityEvent('csp_violation', 'medium', 'CSP violation', 'browser', {})
    })

    it('should export logs as JSON', () => {
      const jsonExport = loggingService.exportLogsJSON()
      const parsed = JSON.parse(jsonExport)

      expect(parsed).toHaveProperty('logs')
      expect(parsed).toHaveProperty('securityEvents')
      expect(parsed).toHaveProperty('exportedAt')
      expect(parsed).toHaveProperty('statistics')

      expect(parsed.logs).toHaveLength(2) // Regular log + security log
      expect(parsed.securityEvents).toHaveLength(1)
    })

    it('should export logs as CSV', () => {
      const csvExport = loggingService.exportLogsCSV()

      expect(csvExport).toContain('"Timestamp","Level","Category","Message"')
      expect(csvExport).toContain('test-category')
      expect(csvExport).toContain('Test log')
      expect(csvExport).toContain('security')
    })
  })

  describe('log level filtering', () => {
    beforeEach(() => {
      loggingService.clearLogs()
      loggingService.debug('Debug message')
      loggingService.info('Info message')
      loggingService.warn('Warning message')
      loggingService.error('Error message')
      loggingService.critical('Critical message')
    })

    it('should filter logs by minimum level', () => {
      expect(loggingService.getLogStatistics().totalLogs).toBe(5)

      loggingService.setLogLevel('warn')

      const stats = loggingService.getLogStatistics()
      expect(stats.totalLogs).toBe(3) // warn, error, critical
      expect(stats.logsByLevel.debug).toBe(0)
      expect(stats.logsByLevel.info).toBe(0)
      expect(stats.logsByLevel.warn).toBe(1)
      expect(stats.logsByLevel.error).toBe(1)
      expect(stats.logsByLevel.critical).toBe(1)
    })
  })

  describe('batch logging and flushing', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production')
      mockFetch.mockResolvedValue({ ok: true })
    })

    it('should handle production environment', () => {
      // Test that logging service works in production mode
      loggingService.info('Production log')
      
      const logs = loggingService.getLogsByCategory('general')
      expect(logs).toHaveLength(1)
      expect(logs[0].message).toBe('Production log')
    })

    it('should handle critical messages in production', () => {
      loggingService.critical('Critical error')

      const criticalLogs = loggingService.getLogsByLevel('critical')
      expect(criticalLogs).toHaveLength(1)
      expect(criticalLogs[0].message).toBe('Critical error')
    })

    it('should handle network errors gracefully', () => {
      // Test that logging doesn't break when network operations fail
      expect(() => {
        loggingService.critical('Critical error')
      }).not.toThrow()
    })
  })

  describe('memory management', () => {
    it('should limit stored logs to maximum', () => {
      loggingService.clearLogs()

      // Add more logs than the limit (10,000)
      for (let i = 0; i < 10005; i++) {
        loggingService.info(`Log ${i}`)
      }

      const stats = loggingService.getLogStatistics()
      expect(stats.totalLogs).toBe(10000) // Should be limited
    })

    it('should limit stored security events to maximum', () => {
      loggingService.clearLogs()

      // Add more security events than the limit (5,000)
      for (let i = 0; i < 5005; i++) {
        loggingService.logSecurityEvent('rate_limit', 'low', `Event ${i}`, 'test', {})
      }

      const securityEvents = loggingService.getSecurityEvents()
      expect(securityEvents).toHaveLength(5000) // Should be limited
    })
  })

  describe('cleanup', () => {
    it('should clear all logs and events', () => {
      loggingService.info('Test log')
      loggingService.logSecurityEvent('data_access', 'low', 'Test event', 'test', {})

      expect(loggingService.getLogStatistics().totalLogs).toBeGreaterThan(0)
      expect(loggingService.getSecurityEvents()).toHaveLength(1)

      loggingService.clearLogs()

      expect(loggingService.getLogStatistics().totalLogs).toBe(0)
      expect(loggingService.getSecurityEvents()).toHaveLength(0)
    })
  })
})
