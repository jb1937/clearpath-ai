import { dataSecurityService } from './dataSecurity'
import { SecureError, SecureErrorFactory } from '../utils/secureError'
import type { GeneratedDocument, DocumentMetadata, DocumentAuditLog } from '../types/documents'

/**
 * Document Storage & Management Service
 * Handles secure storage, retrieval, and management of generated legal documents
 * Includes versioning, access control, and audit logging
 */

export interface DocumentStorageOptions {
  encrypt?: boolean
  compress?: boolean
  versioning?: boolean
  retentionDays?: number
  accessLevel?: 'public' | 'private' | 'restricted'
}

export interface StoredDocument {
  id: string
  originalId: string
  version: number
  title: string
  documentType: string
  templateId?: string
  content: string
  htmlContent: string
  metadata: DocumentMetadata
  storageMetadata: {
    storedAt: Date
    lastAccessed: Date
    accessCount: number
    encrypted: boolean
    compressed: boolean
    fileSize: number
    checksum: string
  }
  accessControl: {
    level: 'public' | 'private' | 'restricted'
    allowedUsers: string[]
    expiresAt?: Date
  }
  status: 'active' | 'archived' | 'deleted'
}

export interface DocumentSearchQuery {
  title?: string
  documentType?: string
  jurisdiction?: string
  dateRange?: {
    start: Date
    end: Date
  }
  status?: 'active' | 'archived' | 'deleted'
  accessLevel?: 'public' | 'private' | 'restricted'
  limit?: number
  offset?: number
}

export interface DocumentSearchResult {
  documents: StoredDocument[]
  totalCount: number
  hasMore: boolean
}

export interface DocumentStorageResult {
  success: boolean
  documentId?: string
  version?: number
  errors?: Array<{
    field: string
    message: string
    code: string
    severity: 'error' | 'warning'
  }>
}

export class DocumentStorageService {
  private static instance: DocumentStorageService
  private documents: Map<string, StoredDocument[]> = new Map() // documentId -> versions
  private auditLogs: DocumentAuditLog[] = []
  private readonly maxStorageSize = 100 * 1024 * 1024 // 100MB limit
  private currentStorageSize = 0

  private constructor() {
    this.initializeStorage()
  }

  static getInstance(): DocumentStorageService {
    if (!DocumentStorageService.instance) {
      DocumentStorageService.instance = new DocumentStorageService()
    }
    return DocumentStorageService.instance
  }

  /**
   * Store a generated document with security and versioning
   */
  async storeDocument(
    document: GeneratedDocument,
    options: DocumentStorageOptions = {}
  ): Promise<DocumentStorageResult> {
    try {
      // Validate storage request
      const validation = this.validateStorageRequest(document, options)
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        }
      }

      // Check storage limits
      const documentSize = this.calculateDocumentSize(document)
      if (this.currentStorageSize + documentSize > this.maxStorageSize) {
        return {
          success: false,
          errors: [{
            field: 'storage',
            message: 'Storage limit exceeded. Please archive or delete old documents.',
            code: 'STORAGE_LIMIT_EXCEEDED',
            severity: 'error'
          }]
        }
      }

      // Get existing versions or create new document entry
      const existingVersions = this.documents.get(document.id) || []
      const newVersion = existingVersions.length + 1

      // Prepare document content
      let content = document.content
      let htmlContent = document.htmlContent

      // Apply compression if requested
      if (options.compress) {
        content = this.compressContent(content)
        htmlContent = this.compressContent(htmlContent)
      }

      // Apply encryption if requested or if document contains sensitive data
      const shouldEncrypt = options.encrypt || this.containsSensitiveData(document)
      if (shouldEncrypt) {
        content = dataSecurityService.encryptData(content)
        htmlContent = dataSecurityService.encryptData(htmlContent)
      }

      // Generate checksum for integrity verification
      const checksum = this.generateChecksum(document.content + document.htmlContent)

      // Create stored document
      const storedDocument: StoredDocument = {
        id: dataSecurityService.generateSecureId(),
        originalId: document.id,
        version: newVersion,
        title: document.title,
        documentType: document.documentType,
        content,
        htmlContent,
        metadata: document.metadata,
        storageMetadata: {
          storedAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 0,
          encrypted: shouldEncrypt,
          compressed: options.compress || false,
          fileSize: documentSize,
          checksum
        },
        accessControl: {
          level: options.accessLevel || 'private',
          allowedUsers: [],
          expiresAt: options.retentionDays ? 
            new Date(Date.now() + options.retentionDays * 24 * 60 * 60 * 1000) : 
            undefined
        },
        status: 'active'
      }

      // Store the document
      const updatedVersions = [...existingVersions, storedDocument]
      this.documents.set(document.id, updatedVersions)
      this.currentStorageSize += documentSize

      // Log audit event
      this.logAudit('stored', storedDocument.id, {
        originalId: document.id,
        version: newVersion,
        encrypted: shouldEncrypt,
        compressed: options.compress || false,
        fileSize: documentSize
      })

      return {
        success: true,
        documentId: storedDocument.id,
        version: newVersion
      }

    } catch (error) {
      console.error('Document storage failed:', error)
      
      return {
        success: false,
        errors: [{
          field: 'storage',
          message: 'Document storage failed due to an internal error',
          code: 'STORAGE_ERROR',
          severity: 'error'
        }]
      }
    }
  }

  /**
   * Retrieve a stored document by ID and version
   */
  async retrieveDocument(
    documentId: string,
    version?: number,
    userId?: string
  ): Promise<StoredDocument | null> {
    try {
      const versions = this.documents.get(documentId)
      if (!versions || versions.length === 0) {
        return null
      }

      // Get specific version or latest
      const document = version ? 
        versions.find(v => v.version === version) :
        versions[versions.length - 1]

      if (!document) {
        return null
      }

      // Check access permissions
      if (!this.hasAccess(document, userId)) {
        throw SecureErrorFactory.unauthorizedAccess(`document ${documentId}`, {
          userId,
          documentId,
          accessLevel: document.accessControl.level
        })
      }

      // Check if document has expired
      if (document.accessControl.expiresAt && document.accessControl.expiresAt < new Date()) {
        return null
      }

      // Decrypt content if encrypted
      let content = document.content
      let htmlContent = document.htmlContent

      if (document.storageMetadata.encrypted) {
        content = dataSecurityService.decryptData(content)
        htmlContent = dataSecurityService.decryptData(htmlContent)
      }

      // Decompress content if compressed
      if (document.storageMetadata.compressed) {
        content = this.decompressContent(content)
        htmlContent = this.decompressContent(htmlContent)
      }

      // Update access tracking
      document.storageMetadata.lastAccessed = new Date()
      document.storageMetadata.accessCount++

      // Log audit event
      this.logAudit('accessed', document.id, {
        userId,
        version: document.version,
        accessCount: document.storageMetadata.accessCount
      })

      // Return document with decrypted/decompressed content
      return {
        ...document,
        content,
        htmlContent
      }

    } catch (error) {
      console.error('Document retrieval failed:', error)
      
      if (error instanceof SecureError) {
        throw error
      }
      
      throw new Error('Document retrieval failed')
    }
  }

  /**
   * Search stored documents with filters
   */
  async searchDocuments(
    query: DocumentSearchQuery,
    userId?: string
  ): Promise<DocumentSearchResult> {
    try {
      let allDocuments: StoredDocument[] = []

      // Collect all documents from all versions
      for (const versions of this.documents.values()) {
        // Get latest version of each document
        const latestVersion = versions[versions.length - 1]
        if (latestVersion && this.hasAccess(latestVersion, userId)) {
          allDocuments.push(latestVersion)
        }
      }

      // Apply filters
      let filteredDocuments = allDocuments.filter(doc => {
        // Title filter
        if (query.title && !doc.title.toLowerCase().includes(query.title.toLowerCase())) {
          return false
        }

        // Document type filter
        if (query.documentType && doc.documentType !== query.documentType) {
          return false
        }

        // Jurisdiction filter
        if (query.jurisdiction && doc.metadata.jurisdiction !== query.jurisdiction) {
          return false
        }

        // Date range filter
        if (query.dateRange) {
          const docDate = doc.storageMetadata.storedAt
          if (docDate < query.dateRange.start || docDate > query.dateRange.end) {
            return false
          }
        }

        // Status filter
        if (query.status && doc.status !== query.status) {
          return false
        }

        // Access level filter
        if (query.accessLevel && doc.accessControl.level !== query.accessLevel) {
          return false
        }

        return true
      })

      // Sort by storage date (newest first)
      filteredDocuments.sort((a, b) => 
        b.storageMetadata.storedAt.getTime() - a.storageMetadata.storedAt.getTime()
      )

      // Apply pagination
      const offset = query.offset || 0
      const limit = query.limit || 50
      const totalCount = filteredDocuments.length
      const paginatedDocuments = filteredDocuments.slice(offset, offset + limit)

      return {
        documents: paginatedDocuments,
        totalCount,
        hasMore: offset + limit < totalCount
      }

    } catch (error) {
      console.error('Document search failed:', error)
      
      return {
        documents: [],
        totalCount: 0,
        hasMore: false
      }
    }
  }

  /**
   * Delete a document (soft delete with audit trail)
   */
  async deleteDocument(
    documentId: string,
    version?: number,
    userId?: string
  ): Promise<DocumentStorageResult> {
    try {
      const versions = this.documents.get(documentId)
      if (!versions || versions.length === 0) {
        return {
          success: false,
          errors: [{
            field: 'documentId',
            message: 'Document not found',
            code: 'DOCUMENT_NOT_FOUND',
            severity: 'error'
          }]
        }
      }

      // Find document to delete
      const documentIndex = version ? 
        versions.findIndex(v => v.version === version) :
        versions.length - 1

      if (documentIndex === -1) {
        return {
          success: false,
          errors: [{
            field: 'version',
            message: 'Document version not found',
            code: 'VERSION_NOT_FOUND',
            severity: 'error'
          }]
        }
      }

      const document = versions[documentIndex]

      // Check access permissions
      if (!this.hasAccess(document, userId)) {
        return {
          success: false,
          errors: [{
            field: 'access',
            message: 'Access denied',
            code: 'ACCESS_DENIED',
            severity: 'error'
          }]
        }
      }

      // Soft delete - mark as deleted but keep for audit
      document.status = 'deleted'
      this.currentStorageSize -= document.storageMetadata.fileSize

      // Log audit event
      this.logAudit('deleted', document.id, {
        userId,
        version: document.version,
        deletedAt: new Date()
      })

      return {
        success: true,
        documentId: document.id,
        version: document.version
      }

    } catch (error) {
      console.error('Document deletion failed:', error)
      
      return {
        success: false,
        errors: [{
          field: 'deletion',
          message: 'Document deletion failed due to an internal error',
          code: 'DELETION_ERROR',
          severity: 'error'
        }]
      }
    }
  }

  /**
   * Archive old documents to free up storage space
   */
  async archiveOldDocuments(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    let archivedCount = 0

    for (const versions of this.documents.values()) {
      for (const document of versions) {
        if (document.status === 'active' && 
            document.storageMetadata.storedAt < cutoffDate &&
            document.storageMetadata.lastAccessed < cutoffDate) {
          
          document.status = 'archived'
          archivedCount++

          // Log audit event
          this.logAudit('archived', document.id, {
            archivedAt: new Date(),
            reason: 'automatic_archival',
            olderThanDays
          })
        }
      }
    }

    return archivedCount
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalDocuments: number
    activeDocuments: number
    archivedDocuments: number
    deletedDocuments: number
    totalStorageUsed: number
    storageLimit: number
    storageUsagePercent: number
  } {
    let totalDocuments = 0
    let activeDocuments = 0
    let archivedDocuments = 0
    let deletedDocuments = 0

    for (const versions of this.documents.values()) {
      for (const document of versions) {
        totalDocuments++
        switch (document.status) {
          case 'active':
            activeDocuments++
            break
          case 'archived':
            archivedDocuments++
            break
          case 'deleted':
            deletedDocuments++
            break
        }
      }
    }

    return {
      totalDocuments,
      activeDocuments,
      archivedDocuments,
      deletedDocuments,
      totalStorageUsed: this.currentStorageSize,
      storageLimit: this.maxStorageSize,
      storageUsagePercent: (this.currentStorageSize / this.maxStorageSize) * 100
    }
  }

  /**
   * Validate storage request
   */
  private validateStorageRequest(
    document: GeneratedDocument,
    options: DocumentStorageOptions
  ): { isValid: boolean; errors: any[] } {
    const errors: any[] = []

    // Validate document
    if (!document || !document.id || !document.content) {
      errors.push({
        field: 'document',
        message: 'Valid document with ID and content is required',
        code: 'INVALID_DOCUMENT',
        severity: 'error'
      })
    }

    // Validate retention period
    if (options.retentionDays && (options.retentionDays < 1 || options.retentionDays > 2555)) { // Max 7 years
      errors.push({
        field: 'retentionDays',
        message: 'Retention period must be between 1 and 2555 days',
        code: 'INVALID_RETENTION',
        severity: 'error'
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if user has access to document
   */
  private hasAccess(document: StoredDocument, userId?: string): boolean {
    // Public documents are accessible to everyone
    if (document.accessControl.level === 'public') {
      return true
    }

    // Private and restricted documents require user ID
    if (!userId) {
      return false
    }

    // Check if user is in allowed users list
    if (document.accessControl.allowedUsers.includes(userId)) {
      return true
    }

    // For now, allow access if no specific restrictions
    // In a real implementation, this would check against user permissions
    return document.accessControl.level === 'private'
  }

  /**
   * Check if document contains sensitive data
   */
  private containsSensitiveData(document: GeneratedDocument): boolean {
    const sensitivePatterns = [
      /social security/i,
      /ssn/i,
      /date of birth/i,
      /driver.?license/i,
      /address/i,
      /phone/i,
      /email/i
    ]

    const contentToCheck = document.content + ' ' + document.htmlContent
    return sensitivePatterns.some(pattern => pattern.test(contentToCheck))
  }

  /**
   * Calculate document size in bytes
   */
  private calculateDocumentSize(document: GeneratedDocument): number {
    const contentSize = new Blob([document.content]).size
    const htmlSize = new Blob([document.htmlContent]).size
    const metadataSize = new Blob([JSON.stringify(document.metadata)]).size
    
    return contentSize + htmlSize + metadataSize
  }

  /**
   * Generate checksum for document integrity
   */
  private generateChecksum(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  /**
   * Compress content (simulated - would use actual compression library)
   */
  private compressContent(content: string): string {
    // In a real implementation, this would use a compression library like pako
    // For now, we'll simulate compression by removing extra whitespace
    return content.replace(/\s+/g, ' ').trim()
  }

  /**
   * Decompress content (simulated)
   */
  private decompressContent(content: string): string {
    // In a real implementation, this would decompress using the same library
    // For now, we'll just return the content as-is
    return content
  }

  /**
   * Log audit event
   */
  private logAudit(
    action: DocumentAuditLog['action'],
    documentId: string,
    details: Record<string, any>
  ): void {
    const auditEntry: DocumentAuditLog = {
      id: dataSecurityService.generateSecureId(),
      documentId,
      action,
      timestamp: new Date(),
      details,
      ipAddress: 'client-side', // Would be populated server-side
      userAgent: navigator.userAgent
    }

    this.auditLogs.push(auditEntry)

    // Keep audit log size manageable
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-500)
    }
  }

  /**
   * Initialize storage system
   */
  private initializeStorage(): void {
    // Initialize storage system
    // In a real implementation, this would connect to a database
    console.log('Document storage service initialized')
  }

  /**
   * Get audit logs for compliance
   */
  getAuditLogs(documentId?: string): DocumentAuditLog[] {
    if (documentId) {
      return this.auditLogs.filter(log => log.documentId === documentId)
    }
    return [...this.auditLogs]
  }

  /**
   * Clear storage (for testing)
   */
  clearStorage(): void {
    this.documents.clear()
    this.auditLogs.length = 0
    this.currentStorageSize = 0
  }
}

// Export singleton instance
export const documentStorageService = DocumentStorageService.getInstance()
