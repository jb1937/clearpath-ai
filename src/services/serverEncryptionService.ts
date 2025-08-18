/**
 * Server-Side Encryption Service
 * Handles secure data operations through API calls instead of client-side encryption
 */

import { config } from '../config/env'

export interface EncryptionResponse {
  success: boolean
  data?: string
  error?: string
  requestId: string
}

export interface DecryptionResponse {
  success: boolean
  data?: any
  error?: string
  requestId: string
}

export class ServerEncryptionService {
  private static instance: ServerEncryptionService
  private readonly apiUrl: string

  private constructor() {
    this.apiUrl = config.apiUrl
  }

  static getInstance(): ServerEncryptionService {
    if (!ServerEncryptionService.instance) {
      ServerEncryptionService.instance = new ServerEncryptionService()
    }
    return ServerEncryptionService.instance
  }

  /**
   * Encrypt sensitive data on the server
   */
  async encryptData(data: any, dataType: 'case' | 'personal' | 'document' = 'case'): Promise<EncryptionResponse> {
    const requestId = this.generateRequestId()
    
    try {
      const response = await fetch(`${this.apiUrl}/api/encrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Data-Type': dataType
        },
        body: JSON.stringify({
          data,
          timestamp: Date.now(),
          clientId: this.getClientId()
        })
      })

      if (!response.ok) {
        throw new Error(`Encryption failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.encryptedData,
        requestId
      }
    } catch (error) {
      console.error('Server encryption failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown encryption error',
        requestId
      }
    }
  }

  /**
   * Decrypt data from the server
   */
  async decryptData(encryptedData: string, dataType: 'case' | 'personal' | 'document' = 'case'): Promise<DecryptionResponse> {
    const requestId = this.generateRequestId()
    
    try {
      const response = await fetch(`${this.apiUrl}/api/decrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Data-Type': dataType
        },
        body: JSON.stringify({
          encryptedData,
          timestamp: Date.now(),
          clientId: this.getClientId()
        })
      })

      if (!response.ok) {
        throw new Error(`Decryption failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data,
        requestId
      }
    } catch (error) {
      console.error('Server decryption failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown decryption error',
        requestId
      }
    }
  }

  /**
   * Store encrypted data on server with expiration
   */
  async storeSecureData(data: any, expirationMinutes: number = 30): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    const requestId = this.generateRequestId()
    
    try {
      const response = await fetch(`${this.apiUrl}/api/secure-store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        },
        body: JSON.stringify({
          data,
          expirationMinutes,
          timestamp: Date.now(),
          clientId: this.getClientId()
        })
      })

      if (!response.ok) {
        throw new Error(`Secure storage failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return {
        success: true,
        sessionId: result.sessionId
      }
    } catch (error) {
      console.error('Secure storage failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown storage error'
      }
    }
  }

  /**
   * Retrieve encrypted data from server
   */
  async retrieveSecureData<T>(sessionId: string): Promise<{ success: boolean; data?: T; error?: string }> {
    const requestId = this.generateRequestId()
    
    try {
      const response = await fetch(`${this.apiUrl}/api/secure-retrieve/${sessionId}`, {
        method: 'GET',
        headers: {
          'X-Request-ID': requestId,
          'X-Client-ID': this.getClientId()
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'Session expired or not found'
          }
        }
        throw new Error(`Secure retrieval failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('Secure retrieval failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown retrieval error'
      }
    }
  }

  /**
   * Delete encrypted data from server
   */
  async deleteSecureData(sessionId: string): Promise<{ success: boolean; error?: string }> {
    const requestId = this.generateRequestId()
    
    try {
      const response = await fetch(`${this.apiUrl}/api/secure-delete/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'X-Request-ID': requestId,
          'X-Client-ID': this.getClientId()
        }
      })

      if (!response.ok) {
        throw new Error(`Secure deletion failed: ${response.status} ${response.statusText}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Secure deletion failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deletion error'
      }
    }
  }

  /**
   * Generate a unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get or generate a client ID for this session
   */
  private getClientId(): string {
    let clientId = sessionStorage.getItem('clearpath_client_id')
    if (!clientId) {
      clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('clearpath_client_id', clientId)
    }
    return clientId
  }

  /**
   * Health check for the encryption service
   */
  async healthCheck(): Promise<{ success: boolean; latency?: number; error?: string }> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${this.apiUrl}/api/encrypt/health`, {
        method: 'GET',
        headers: {
          'X-Request-ID': this.generateRequestId()
        }
      })

      const latency = Date.now() - startTime

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }

      return {
        success: true,
        latency
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      }
    }
  }
}

// Export singleton instance
export const serverEncryptionService = ServerEncryptionService.getInstance()
