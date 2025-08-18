/**
 * Security Configuration for ClearPathAI
 * Centralized security settings and constants
 */

export const securityConfig = {
  template: {
    // Maximum template complexity to prevent DoS
    maxComplexity: 1000,
    
    // Processing timeout in milliseconds
    processingTimeout: 5000,
    
    // Whitelisted template variables - ONLY these are allowed
    allowedVariables: [
      // User case data
      'userCase.id',
      'userCase.offense',
      'userCase.offenseDate',
      'userCase.outcome',
      'userCase.ageAtOffense',
      'userCase.jurisdiction',
      'userCase.sentence.jailTime',
      'userCase.sentence.probation',
      'userCase.sentence.fines',
      'userCase.sentence.communityService',
      'userCase.sentence.allCompleted',
      'userCase.sentence.completionDate',
      
      // Personal information
      'firstName',
      'lastName',
      'middleName',
      'dateOfBirth',
      'address',
      'phone',
      'email',
      'ssn',
      
      // Additional factors
      'additionalFactors.hasOpenCases',
      'additionalFactors.isTraffickingVictim',
      'additionalFactors.seekingActualInnocence',
      'additionalFactors.additionalInfo',
      
      // System-generated fields
      'currentDate',
      'filingDate',
      'jurisdiction',
      'courtName',
      'attorneyName',
      'attorneyBarNumber',
      
      // Document metadata
      'documentTitle',
      'caseNumber',
      'filingFee'
    ],
    
    // Dangerous patterns to block
    blockedPatterns: [
      /javascript:/gi,
      /on\w+=/gi,
      /<script/gi,
      /<\/script>/gi,
      /eval\(/gi,
      /function\(/gi,
      /=>/gi,
      /\$\{/gi,
      /`/gi
    ]
  },
  
  cache: {
    // Maximum cache size (number of entries)
    maxSize: 100,
    
    // Time-to-live in minutes
    ttlMinutes: 30,
    
    // Require encryption for cached data
    encryptionRequired: true,
    
    // Salt for cache key generation
    keySalt: process.env.CACHE_SALT || 'clearpath-ai-cache-salt-2024'
  },
  
  validation: {
    // Maximum field length for text inputs
    maxFieldLength: 1000,
    
    // Maximum length for long text fields
    maxLongTextLength: 5000,
    
    // Allowed character set for text inputs
    allowedCharsets: /^[a-zA-Z0-9\s\-.,!?()'"\/\n\r]+$/,
    
    // Rate limiting
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 1000
  },
  
  encryption: {
    // Algorithm for data encryption
    algorithm: 'aes-256-gcm',
    
    // Key derivation iterations
    iterations: 100000,
    
    // Salt length for key derivation
    saltLength: 32,
    
    // IV length for encryption
    ivLength: 16
  },
  
  audit: {
    // Events to log
    loggedEvents: [
      'document_generated',
      'template_processed',
      'validation_failed',
      'security_violation',
      'rate_limit_exceeded',
      'authentication_failed',
      'data_accessed',
      'data_modified'
    ],
    
    // Retention period for audit logs (days)
    retentionDays: 365,
    
    // Enable real-time security monitoring
    realTimeMonitoring: true
  },
  
  headers: {
    // Content Security Policy
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';",
    
    // Additional security headers
    additionalHeaders: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
  }
}

// Data sensitivity levels
export enum DataSensitivity {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted'
}

// Security event severity levels
export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Security event types
export enum SecurityEventType {
  TEMPLATE_INJECTION_ATTEMPT = 'template_injection_attempt',
  INVALID_INPUT_DETECTED = 'invalid_input_detected',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CACHE_POISONING_ATTEMPT = 'cache_poisoning_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_VALIDATION_FAILED = 'data_validation_failed',
  SUSPICIOUS_PATTERN_DETECTED = 'suspicious_pattern_detected'
}
