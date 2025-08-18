import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { serverEncryptionService } from '../../services/serverEncryptionService'

// Mock fetch globally
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

describe('ServerEncryptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionStorage.getItem.mockReturnValue('test-client-id')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('encryptData', () => {
    it('should successfully encrypt data', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ encryptedData: 'encrypted-test-data' })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const testData = { sensitive: 'information' }
      const result = await serverEncryptionService.encryptData(testData, 'case')

      expect(result.success).toBe(true)
      expect(result.data).toBe('encrypted-test-data')
      expect(result.requestId).toMatch(/^req_\d+_[a-z0-9]+$/)
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/encrypt'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Request-ID': expect.any(String),
            'X-Data-Type': 'case'
          }),
          body: expect.stringContaining('"sensitive":"information"')
        })
      )
    })

    it('should handle encryption failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const testData = { test: 'data' }
      const result = await serverEncryptionService.encryptData(testData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      expect(result.requestId).toMatch(/^req_\d+_[a-z0-9]+$/)
    })

    it('should handle HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await serverEncryptionService.encryptData({ test: 'data' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Encryption failed: 500 Internal Server Error')
    })
  })

  describe('decryptData', () => {
    it('should successfully decrypt data', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ data: { decrypted: 'information' } })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await serverEncryptionService.decryptData('encrypted-data', 'personal')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ decrypted: 'information' })
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/decrypt'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Data-Type': 'personal'
          })
        })
      )
    })

    it('should handle decryption failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Decryption failed'))

      const result = await serverEncryptionService.decryptData('invalid-data')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Decryption failed')
    })
  })

  describe('storeSecureData', () => {
    it('should successfully store secure data', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ sessionId: 'session-123' })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const testData = { secure: 'data' }
      const result = await serverEncryptionService.storeSecureData(testData, 60)

      expect(result.success).toBe(true)
      expect(result.sessionId).toBe('session-123')
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/secure-store'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"expirationMinutes":60')
        })
      )
    })

    it('should use default expiration time', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ sessionId: 'session-123' })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      await serverEncryptionService.storeSecureData({ test: 'data' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"expirationMinutes":30')
        })
      )
    })
  })

  describe('retrieveSecureData', () => {
    it('should successfully retrieve secure data', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ data: { retrieved: 'data' } })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await serverEncryptionService.retrieveSecureData('session-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ retrieved: 'data' })
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/secure-retrieve/session-123'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Client-ID': 'test-client-id'
          })
        })
      )
    })

    it('should handle session not found', async () => {
      const mockResponse = {
        ok: false,
        status: 404
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await serverEncryptionService.retrieveSecureData('invalid-session')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Session expired or not found')
    })
  })

  describe('deleteSecureData', () => {
    it('should successfully delete secure data', async () => {
      const mockResponse = { ok: true }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await serverEncryptionService.deleteSecureData('session-123')

      expect(result.success).toBe(true)
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/secure-delete/session-123'),
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    it('should handle deletion failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Delete failed'))

      const result = await serverEncryptionService.deleteSecureData('session-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Delete failed')
    })
  })

  describe('healthCheck', () => {
    it('should perform successful health check', async () => {
      const mockResponse = { ok: true }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await serverEncryptionService.healthCheck()

      expect(result.success).toBe(true)
      expect(result.latency).toBeGreaterThanOrEqual(0)
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/encrypt/health'),
        expect.objectContaining({
          method: 'GET'
        })
      )
    })

    it('should handle health check failure', async () => {
      const mockResponse = { ok: false, status: 503 }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await serverEncryptionService.healthCheck()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Health check failed: 503')
    })
  })

  describe('client ID management', () => {
    it('should generate new client ID if none exists', async () => {
      mockSessionStorage.getItem.mockReturnValue(null)
      
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ encryptedData: 'test' })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      await serverEncryptionService.encryptData({ test: 'data' })

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'clearpath_client_id',
        expect.stringMatching(/^client_\d+_[a-z0-9]+$/)
      )
    })

    it('should use existing client ID', async () => {
      mockSessionStorage.getItem.mockReturnValue('existing-client-id')
      
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ encryptedData: 'test' })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      await serverEncryptionService.encryptData({ test: 'data' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"clientId":"existing-client-id"')
        })
      )
    })
  })
})
