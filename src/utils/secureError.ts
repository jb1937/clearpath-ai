import { SecuritySeverity, SecurityEventType } from '../config/security'

/**
 * Secure Error Handling Utility
 * Prevents information disclosure while maintaining proper error tracking
 */

export interface SecurityEvent {
  type: SecurityEventType
  severity: SecuritySeverity
  message: string
  userMessage: string
  timestamp: Date
  context?: Record<string, any>
  stackTrace?: string
}

export class SecureError extends Error {
  public readonly userMessage: string
  public readonly code: string
  public readonly severity: SecuritySeverity
  public readonly securityEvent: SecurityEvent
  public readonly context: Record<string, any>

  constructor(
    internalMessage: string,
    userMessage: string,
    code: string,
    severity: SecuritySeverity = SecuritySeverity.MEDIUM,
    context: Record<string, any> = {}
  ) {
    super(internalMessage)
    this.name = 'SecureError'
    this.userMessage = userMessage
    this.code = code
    this.severity = severity
    this.context = context

    // Create security event for logging
    this.securityEvent = {
      type: this.mapCodeToEventType(code),
      severity,
      message: internalMessage,
      userMessage,
      timestamp: new Date(),
      context: this.sanitizeContext(context),
      stackTrace: this.stack
    }

    // Log security event immediately
    this.logSecurityEvent()
  }

  /**
   * Get user-safe response object
   */
  toUserResponse(): {
    success: false
    error: {
      message: string
      code: string
      timestamp: string
    }
  } {
    return {
      success: false,
      error: {
        message: this.userMessage,
        code: this.code,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Get detailed response for internal logging
   */
  toInternalResponse(): {
    success: false
    error: {
      message: string
      userMessage: string
      code: string
      severity: SecuritySeverity
      timestamp: string
      context: Record<string, any>
      stackTrace?: string
    }
  } {
    return {
      success: false,
      error: {
        message: this.message,
        userMessage: this.userMessage,
        code: this.code,
        severity: this.severity,
        timestamp: new Date().toISOString(),
        context: this.context,
        stackTrace: this.stack
      }
    }
  }

  /**
   * Map error codes to security event types
   */
  private mapCodeToEventType(code: string): SecurityEventType {
    const codeMap: Record<string, SecurityEventType> = {
      'TEMPLATE_INJECTION': SecurityEventType.TEMPLATE_INJECTION_ATTEMPT,
      'INVALID_INPUT': SecurityEventType.INVALID_INPUT_DETECTED,
      'RATE_LIMIT_EXCEEDED': SecurityEventType.RATE_LIMIT_EXCEEDED,
      'CACHE_POISONING': SecurityEventType.CACHE_POISONING_ATTEMPT,
      'UNAUTHORIZED_ACCESS': SecurityEventType.UNAUTHORIZED_ACCESS,
      'VALIDATION_FAILED': SecurityEventType.DATA_VALIDATION_FAILED,
      'SUSPICIOUS_PATTERN': SecurityEventType.SUSPICIOUS_PATTERN_DETECTED
    }

    return codeMap[code] || SecurityEventType.SUSPICIOUS_PATTERN_DETECTED
  }

  /**
   * Sanitize context data to remove sensitive information
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'ssn', 'token', 'key', 'secret', 'auth']
    const sanitized: Record<string, any> = {}

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase()
      const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...[TRUNCATED]'
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * Log security event (placeholder for actual logging implementation)
   */
  private logSecurityEvent(): void {
    // In a real implementation, this would send to a logging service
    console.error('SECURITY EVENT:', {
      type: this.securityEvent.type,
      severity: this.securityEvent.severity,
      timestamp: this.securityEvent.timestamp.toISOString(),
      message: this.securityEvent.message,
      context: this.securityEvent.context
    })

    // Alert on high/critical severity events
    if (this.severity === SecuritySeverity.HIGH || this.severity === SecuritySeverity.CRITICAL) {
      this.alertSecurityTeam()
    }
  }

  /**
   * Alert security team for high-severity events
   */
  private alertSecurityTeam(): void {
    // In a real implementation, this would send alerts via email, Slack, etc.
    console.error(`🚨 HIGH SEVERITY SECURITY EVENT: ${this.securityEvent.type}`)
    console.error(`Message: ${this.securityEvent.message}`)
    console.error(`Timestamp: ${this.securityEvent.timestamp.toISOString()}`)
  }
}

/**
 * Common secure error factory functions
 */
export class SecureErrorFactory {
  static templateInjection(attemptedVariable: string, context: Record<string, any> = {}): SecureError {
    return new SecureError(
      `Template injection attempt detected: unauthorized variable '${attemptedVariable}'`,
      'Invalid template variable detected. Please contact support if this error persists.',
      'TEMPLATE_INJECTION',
      SecuritySeverity.HIGH,
      { attemptedVariable, ...context }
    )
  }

  static invalidInput(field: string, value: any, context: Record<string, any> = {}): SecureError {
    return new SecureError(
      `Invalid input detected in field '${field}': ${typeof value === 'string' ? value.substring(0, 50) : String(value)}`,
      'Invalid input detected. Please check your data and try again.',
      'INVALID_INPUT',
      SecuritySeverity.MEDIUM,
      { field, valueType: typeof value, ...context }
    )
  }

  static rateLimitExceeded(identifier: string, limit: number, context: Record<string, any> = {}): SecureError {
    return new SecureError(
      `Rate limit exceeded for ${identifier}: ${limit} requests`,
      'Too many requests. Please wait a moment before trying again.',
      'RATE_LIMIT_EXCEEDED',
      SecuritySeverity.MEDIUM,
      { identifier, limit, ...context }
    )
  }

  static validationFailed(field: string, reason: string, context: Record<string, any> = {}): SecureError {
    return new SecureError(
      `Validation failed for field '${field}': ${reason}`,
      'Data validation failed. Please check your input and try again.',
      'VALIDATION_FAILED',
      SecuritySeverity.LOW,
      { field, reason, ...context }
    )
  }

  static unauthorizedAccess(resource: string, context: Record<string, any> = {}): SecureError {
    return new SecureError(
      `Unauthorized access attempt to resource: ${resource}`,
      'Access denied. You do not have permission to access this resource.',
      'UNAUTHORIZED_ACCESS',
      SecuritySeverity.HIGH,
      { resource, ...context }
    )
  }

  static suspiciousPattern(pattern: string, input: string, context: Record<string, any> = {}): SecureError {
    return new SecureError(
      `Suspicious pattern detected: ${pattern} in input: ${input.substring(0, 50)}`,
      'Suspicious activity detected. Please contact support if this error persists.',
      'SUSPICIOUS_PATTERN',
      SecuritySeverity.MEDIUM,
      { pattern, inputLength: input.length, ...context }
    )
  }
}

/**
 * Error boundary utility for wrapping operations
 */
export class DocumentGenerationErrorBoundary {
  static async execute<T>(
    operation: () => Promise<T>,
    fallback: T,
    context: string,
    additionalContext: Record<string, any> = {}
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      // If it's already a SecureError, re-throw it
      if (error instanceof SecureError) {
        throw error
      }

      // Convert regular errors to SecureErrors
      const secureError = new SecureError(
        `Error in ${context}: ${error instanceof Error ? error.message : String(error)}`,
        'An unexpected error occurred. Please try again or contact support.',
        'OPERATION_FAILED',
        SecuritySeverity.MEDIUM,
        {
          context,
          originalError: error instanceof Error ? error.message : String(error),
          ...additionalContext
        }
      )

      // Log the error but return fallback for graceful degradation
      console.error('Error boundary caught:', secureError.toInternalResponse())
      
      return fallback
    }
  }

  static executeSync<T>(
    operation: () => T,
    fallback: T,
    context: string,
    additionalContext: Record<string, any> = {}
  ): T {
    try {
      return operation()
    } catch (error) {
      // If it's already a SecureError, re-throw it
      if (error instanceof SecureError) {
        throw error
      }

      // Convert regular errors to SecureErrors
      const secureError = new SecureError(
        `Error in ${context}: ${error instanceof Error ? error.message : String(error)}`,
        'An unexpected error occurred. Please try again or contact support.',
        'OPERATION_FAILED',
        SecuritySeverity.MEDIUM,
        {
          context,
          originalError: error instanceof Error ? error.message : String(error),
          ...additionalContext
        }
      )

      // Log the error but return fallback for graceful degradation
      console.error('Error boundary caught:', secureError.toInternalResponse())
      
      return fallback
    }
  }
}
