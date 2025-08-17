import CryptoJS from 'crypto-js'
import DOMPurify from 'dompurify'
import { config } from '../config/env'

/**
 * Data security service for encrypting sensitive user data
 * and sanitizing user input to prevent XSS attacks
 */
export class DataSecurityService {
  private static instance: DataSecurityService
  private readonly encryptionKey: string

  private constructor() {
    this.encryptionKey = config.encryptionKey
  }

  static getInstance(): DataSecurityService {
    if (!DataSecurityService.instance) {
      DataSecurityService.instance = new DataSecurityService()
    }
    return DataSecurityService.instance
  }

  /**
   * Encrypt sensitive data before storing
   */
  encryptData(data: any): string {
    try {
      const jsonString = JSON.stringify(data)
      return CryptoJS.AES.encrypt(jsonString, this.encryptionKey).toString()
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt data when retrieving
   */
  decryptData<T>(encryptedData: string): T {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey)
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8)
      return JSON.parse(decryptedString)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt data')
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
