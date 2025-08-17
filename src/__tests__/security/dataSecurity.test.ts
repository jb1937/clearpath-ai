import { describe, it, expect, beforeEach } from 'vitest'
import { dataSecurityService } from '../../services/dataSecurity'

describe('DataSecurityService', () => {
  beforeEach(() => {
    // Reset any state if needed
  })

  describe('Input Sanitization', () => {
    it('should sanitize malicious script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World'
      const sanitized = dataSecurityService.sanitizeInput(maliciousInput)
      
      expect(sanitized).toBe('Hello World')
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
    })

    it('should sanitize javascript: URLs', () => {
      const maliciousInput = 'javascript:alert("xss")'
      const sanitized = dataSecurityService.sanitizeInput(maliciousInput)
      
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('alert')
    })

    it('should sanitize event handlers', () => {
      const maliciousInput = '<div onclick="alert(\'xss\')">Click me</div>'
      const sanitized = dataSecurityService.sanitizeInput(maliciousInput)
      
      expect(sanitized).not.toContain('onclick')
      expect(sanitized).not.toContain('alert')
    })

    it('should preserve safe text content', () => {
      const safeInput = 'Simple marijuana possession'
      const sanitized = dataSecurityService.sanitizeInput(safeInput)
      
      expect(sanitized).toBe(safeInput)
    })

    it('should handle empty and null inputs', () => {
      expect(dataSecurityService.sanitizeInput('')).toBe('')
      expect(() => dataSecurityService.sanitizeInput(null as any)).not.toThrow()
    })
  })

  describe('Input Validation', () => {
    it('should validate input length', () => {
      const shortInput = 'Valid input'
      const longInput = 'x'.repeat(300)
      
      expect(dataSecurityService.validateInput(shortInput)).toBe(true)
      expect(dataSecurityService.validateInput(longInput)).toBe(false)
    })

    it('should detect malicious patterns', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img onerror="alert(1)" src="x">',
        'data:text/html,<script>alert(1)</script>'
      ]
      
      maliciousInputs.forEach(input => {
        expect(dataSecurityService.validateInput(input)).toBe(false)
      })
    })

    it('should accept safe inputs', () => {
      const safeInputs = [
        'Simple marijuana possession',
        'Theft in the second degree',
        'DUI - first offense',
        'Assault and battery'
      ]
      
      safeInputs.forEach(input => {
        expect(dataSecurityService.validateInput(input)).toBe(true)
      })
    })
  })

  describe('Data Encryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = {
        offense: 'Simple marijuana possession',
        date: '2020-01-01',
        sensitive: true
      }
      
      const encrypted = dataSecurityService.encryptData(originalData)
      expect(encrypted).toBeTruthy()
      expect(encrypted).not.toContain('marijuana')
      
      const decrypted = dataSecurityService.decryptData(encrypted)
      expect(decrypted).toEqual(originalData)
    })

    it('should handle encryption errors gracefully', () => {
      expect(() => dataSecurityService.encryptData(undefined)).toThrow('Failed to encrypt data')
    })

    it('should handle decryption errors gracefully', () => {
      expect(() => dataSecurityService.decryptData('invalid-encrypted-data')).toThrow('Failed to decrypt data')
    })

    it('should generate secure random IDs', () => {
      const id1 = dataSecurityService.generateSecureId()
      const id2 = dataSecurityService.generateSecureId()
      
      expect(id1).toBeTruthy()
      expect(id2).toBeTruthy()
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^[a-f0-9]{32}$/) // 32 hex characters
    })
  })

  describe('HTML Sanitization', () => {
    it('should allow safe HTML tags', () => {
      const safeHtml = '<p>This is <strong>important</strong> information.</p>'
      const sanitized = dataSecurityService.sanitizeHtml(safeHtml)
      
      expect(sanitized).toContain('<p>')
      expect(sanitized).toContain('<strong>')
      expect(sanitized).toContain('important')
    })

    it('should remove dangerous HTML tags', () => {
      const dangerousHtml = '<p>Safe content</p><script>alert("xss")</script>'
      const sanitized = dataSecurityService.sanitizeHtml(dangerousHtml)
      
      expect(sanitized).toContain('<p>')
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
    })
  })
})
