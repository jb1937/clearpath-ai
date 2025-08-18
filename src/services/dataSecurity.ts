import DOMPurify from 'dompurify'
import { config, checkRateLimit } from '../config/env'

/**
 * Data security service for sanitizing user input and providing security utilities
 * NOTE: Client-side encryption removed for security - use server-side encryption instead
 */
export class DataSecurityService {
  private static instance: DataSecurityService

  private constructor() {
    // Initialize security service
  }

  static getInstance(): DataSecurityService {
    if (!DataSecurityService.instance) {
      DataSecurityService.instance = new DataSecurityService()
    }
    return DataSecurityService.instance
  }

  /**
   * DEPRECATED: Client-side encryption removed for security
   * Use server-side API calls for sensitive data operations
   */
  encryptData(data: any): string {
    console.warn('Client-side encryption is deprecated. Use server-side encryption instead.')
    // Return base64 encoded data as temporary fallback (NOT SECURE)
    return btoa(JSON.stringify(data))
  }

  /**
   * DEPRECATED: Client-side decryption removed for security
   * Use server-side API calls for sensitive data operations
   */
  decryptData<T>(encodedData: string): T {
    console.warn('Client-side decryption is deprecated. Use server-side decryption instead.')
    // Return base64 decoded data as temporary fallback (NOT SECURE)
    try {
      return JSON.parse(atob(encodedData))
    } catch (error) {
      console.error('Decoding failed:', error)
      throw new Error('Failed to decode data')
    }
  }

  /**
   * Sanitize user input to prevent XSS attacks
   */
  sanitizeInput(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
      KEEP_CONTENT: true // Keep text content
    })
  }

  /**
   * Sanitize HTML content for display (allows safe HTML)
   */
  sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: []
    })
  }

  /**
   * Validate input length and content
   */
  validateInput(input: string, maxLength: number = config.maxOffenseLength): boolean {
    if (!input || typeof input !== 'string') {
      return false
    }
    
    if (input.length > maxLength) {
      return false
    }
    
    // Check for potentially malicious patterns
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i
    ]
    
    return !maliciousPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Clear sensitive data from memory
   */
  clearSensitiveData(): void {
    // Force garbage collection if available
    if (window.gc) {
      window.gc()
    }
  }

  /**
   * Generate a secure random ID
   */
  generateSecureId(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
}

// Export singleton instance
export const dataSecurityService = DataSecurityService.getInstance()
