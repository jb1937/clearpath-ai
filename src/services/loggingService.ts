/**
 * Comprehensive Logging Service
 * Implements structured logging for security events and application monitoring
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  category: string
  userId?: string
  sessionId?: string
  requestId?: string
  metadata?: Record<string, any>
  stack?: string
  userAgent?: string
  ip?: string
  url?: string
}

export interface SecurityEvent extends LogEntry {
  eventType: 'authentication' | 'authorization' | 'input_validation' | 'rate_limit' | 'csp_violation' | 'error_boundary' | 'data_access'
  severity: 'low' | 'medium' | 'high' | 'critical'
  source: string
  details: Record<string, any>
}

export class LoggingService {
  private static instance: LoggingService
  private logs: LogEntry[] = []
  private securityEvents: SecurityEvent[] = []
  private maxLogs = 10000 // Keep last 10,000 logs
  private maxSecurityEvents = 5000 // Keep last 5,000 security events
  private logEndpoint?: string
  private batchSize = 50
  private batchTimeout = 30000 // 30 seconds
  private pendingLogs: LogEntry[] = []
  private batchTimer?: NodeJS.Timeout

  private constructor() {
    this.setupLogEndpoint()
    this.setupBatchLogging()
    this.setupUnhandledErrorLogging()
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService()
    }
    return LoggingService.instance
  }

  /**
   * Set up log endpoint configuration
   */
  private setupLogEndpoint(): void {
    // In production, this would be configured via environment variables
    this.logEndpoint = process.env.NODE_ENV === 'production' 
      ? '/api/logs' 
      : undefined
  }

  /**
   * Set up batch logging mechanism
   */
  private setupBatchLogging(): void {
    // Send logs in batches to reduce network overhead
    this.batchTimer = setInterval(() => {
      this.flushLogs()
    }, this.batchTimeout)

    // Flush logs before page unload
    window.addEventListener('beforeunload', () => {
      this.flushLogs()
    })
  }

  /**
   * Set up unhandled error logging
   */
  private setupUnhandledErrorLogging(): void {
    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled JavaScript Error', 'error_handling', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      })
    })

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', 'error_handling', {
        reason: event.reason,
        stack: event.reason?.stack
      })
    })
  }

  /**
   * Log debug message
   */
  debug(message: string, category: string = 'general', metadata?: Record<string, any>): void {
    this.log('debug', message, category, metadata)
  }

  /**
   * Log info message
   */
  info(message: string, category: string = 'general', metadata?: Record<string, any>): void {
    this.log('info', message, category, metadata)
  }

  /**
   * Log warning message
   */
  warn(message: string, category: string = 'general', metadata?: Record<string, any>): void {
    this.log('warn', message, category, metadata)
  }

  /**
   * Log error message
   */
  error(message: string, category: string = 'general', metadata?: Record<string, any>): void {
    this.log('error', message, category, metadata)
  }

  /**
   * Log critical message
   */
  critical(message: string, category: string = 'general', metadata?: Record<string, any>): void {
    this.log('critical', message, category, metadata)
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, category: string, metadata?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      category,
      sessionId: this.getSessionId(),
      requestId: this.generateRequestId(),
      metadata,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // Add to local storage
    this.logs.push(logEntry)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Add to pending batch
    this.pendingLogs.push(logEntry)

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'critical' ? 'error' : level
      console[consoleMethod](`[${level.toUpperCase()}] ${category}: ${message}`, metadata)
    }

    // Flush immediately for critical errors
    if (level === 'critical') {
      this.flushLogs()
    }

    // Auto-flush if batch is full
    if (this.pendingLogs.length >= this.batchSize) {
      this.flushLogs()
    }
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    eventType: SecurityEvent['eventType'],
    severity: SecurityEvent['severity'],
    message: string,
    source: string,
    details: Record<string, any>
  ): void {
    const securityEvent: SecurityEvent = {
      timestamp: new Date(),
      level: severity === 'critical' ? 'critical' : severity === 'high' ? 'error' : 'warn',
      message,
      category: 'security',
      sessionId: this.getSessionId(),
      requestId: this.generateRequestId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      eventType,
      severity,
      source,
      details
    }

    // Store security event
    this.securityEvents.push(securityEvent)
    if (this.securityEvents.length > this.maxSecurityEvents) {
      this.securityEvents = this.securityEvents.slice(-this.maxSecurityEvents)
    }

    // Also log as regular log entry
    this.log(securityEvent.level, `SECURITY: ${message}`, 'security', {
      eventType,
      severity,
      source,
      details
    })

    // Immediate alert for critical security events
    if (severity === 'critical') {
      this.handleCriticalSecurityEvent(securityEvent)
    }
  }

  /**
   * Handle critical security events
   */
  private handleCriticalSecurityEvent(event: SecurityEvent): void {
    // In production, this might trigger alerts, notifications, etc.
    console.error('CRITICAL SECURITY EVENT:', event)
    
    // Could integrate with external alerting systems
    // this.sendSecurityAlert(event)
  }

  /**
   * Flush pending logs to server
   */
  private async flushLogs(): Promise<void> {
    if (this.pendingLogs.length === 0 || !this.logEndpoint) {
      return
    }

    const logsToSend = [...this.pendingLogs]
    this.pendingLogs = []

    try {
      await fetch(this.logEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logs: logsToSend,
          timestamp: new Date().toISOString(),
          source: 'clearpath-ai-frontend'
        })
      })
    } catch (error) {
      // If sending fails, add logs back to pending (but don't retry indefinitely)
      console.error('Failed to send logs to server:', error)
      
      // Only retry once to avoid infinite loops
      if (logsToSend.length < this.batchSize * 2) {
        this.pendingLogs.unshift(...logsToSend)
      }
    }
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category)
  }

  /**
   * Get logs within time range
   */
  getLogsInRange(startDate: Date, endDate: Date): LogEntry[] {
    return this.logs.filter(log => 
      log.timestamp >= startDate && log.timestamp <= endDate
    )
  }

  /**
   * Get security events
   */
  getSecurityEvents(): SecurityEvent[] {
    return [...this.securityEvents]
  }

  /**
   * Get security events by severity
   */
  getSecurityEventsBySeverity(severity: SecurityEvent['severity']): SecurityEvent[] {
    return this.securityEvents.filter(event => event.severity === severity)
  }

  /**
   * Generate log statistics
   */
  getLogStatistics(): {
    totalLogs: number
    logsByLevel: Record<LogLevel, number>
    logsByCategory: Record<string, number>
    recentErrors: number
    securityEvents: number
    criticalSecurityEvents: number
  } {
    const logsByLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0
    }

    const logsByCategory: Record<string, number> = {}

    this.logs.forEach(log => {
      logsByLevel[log.level]++
      logsByCategory[log.category] = (logsByCategory[log.category] || 0) + 1
    })

    // Count recent errors (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentErrors = this.logs.filter(log => 
      (log.level === 'error' || log.level === 'critical') && 
      log.timestamp >= oneHourAgo
    ).length

    const criticalSecurityEvents = this.securityEvents.filter(event => 
      event.severity === 'critical'
    ).length

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      logsByCategory,
      recentErrors,
      securityEvents: this.securityEvents.length,
      criticalSecurityEvents
    }
  }

  /**
   * Export logs as JSON
   */
  exportLogsJSON(): string {
    return JSON.stringify({
      logs: this.logs,
      securityEvents: this.securityEvents,
      exportedAt: new Date().toISOString(),
      statistics: this.getLogStatistics()
    }, null, 2)
  }

  /**
   * Export logs as CSV
   */
  exportLogsCSV(): string {
    const headers = [
      'Timestamp',
      'Level',
      'Category',
      'Message',
      'Session ID',
      'URL',
      'User Agent',
      'Metadata'
    ]

    const rows = this.logs.map(log => [
      log.timestamp.toISOString(),
      log.level,
      log.category,
      log.message,
      log.sessionId || '',
      log.url || '',
      log.userAgent || '',
      JSON.stringify(log.metadata || {})
    ])

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = []
    this.securityEvents = []
    this.pendingLogs = []
  }

  /**
   * Set log level filter (for production optimization)
   */
  setLogLevel(minLevel: LogLevel): void {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical']
    const minIndex = levels.indexOf(minLevel)
    
    // Filter existing logs
    this.logs = this.logs.filter(log => {
      const logIndex = levels.indexOf(log.level)
      return logIndex >= minIndex
    })
  }

  /**
   * Performance monitoring
   */
  logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.info(`Performance: ${operation}`, 'performance', {
      duration,
      ...metadata
    })
  }

  /**
   * User action logging
   */
  logUserAction(action: string, details?: Record<string, any>): void {
    this.info(`User Action: ${action}`, 'user_action', details)
  }

  /**
   * API call logging
   */
  logApiCall(method: string, url: string, status: number, duration: number, error?: string): void {
    const level = status >= 400 ? 'error' : 'info'
    this.log(level, `API Call: ${method} ${url}`, 'api', {
      method,
      url,
      status,
      duration,
      error
    })
  }

  /**
   * Get session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('clearpath_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('clearpath_session_id', sessionId)
    }
    return sessionId
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
    }
    this.flushLogs()
  }
}

// Export singleton instance
export const loggingService = LoggingService.getInstance()

// Set up CSP violation logging
window.addEventListener('csp-violation', (event: any) => {
  loggingService.logSecurityEvent(
    'csp_violation',
    'high',
    'Content Security Policy violation detected',
    'csp_monitor',
    event.detail
  )
})

// Set up performance monitoring
const originalFetch = window.fetch
window.fetch = async (...args) => {
  const startTime = Date.now()
  const url = args[0].toString()
  const method = args[1]?.method || 'GET'
  
  try {
    const response = await originalFetch(...args)
    const duration = Date.now() - startTime
    
    loggingService.logApiCall(method, url, response.status, duration)
    
    return response
  } catch (error) {
    const duration = Date.now() - startTime
    loggingService.logApiCall(method, url, 0, duration, error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}
