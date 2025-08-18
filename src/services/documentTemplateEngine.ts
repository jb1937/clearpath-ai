import { dataSecurityService } from './dataSecurity'
import { config } from '../config/env'
import type {
  DocumentTemplate,
  DocumentGenerationRequest,
  DocumentGenerationResult,
  DocumentGenerationOptions,
  GeneratedDocument,
  DocumentError,
  ValidationResult,
  TemplateEngine,
  DocumentField,
  DocumentMetadata,
  DocumentAuditLog
} from '../types/documents'

/**
 * Core Document Template Engine
 * Handles template processing, field validation, and document generation
 * with security, performance, and legal compliance considerations
 */
export class DocumentTemplateEngine implements TemplateEngine {
  private static instance: DocumentTemplateEngine
  private templates: Map<string, DocumentTemplate> = new Map()
  private auditLogs: DocumentAuditLog[] = []
  private generationCache: Map<string, GeneratedDocument> = new Map()

  private constructor() {
    this.initializeTemplates()
  }

  static getInstance(): DocumentTemplateEngine {
    if (!DocumentTemplateEngine.instance) {
      DocumentTemplateEngine.instance = new DocumentTemplateEngine()
    }
    return DocumentTemplateEngine.instance
  }

  /**
   * Generate a legal document from template and user data
   */
  async generateDocument(request: DocumentGenerationRequest): Promise<DocumentGenerationResult> {
    const startTime = performance.now()
    
    try {
      // Security: Validate and sanitize all inputs
      const sanitizedRequest = this.sanitizeRequest(request)
      
      // Validate the request
      const validation = this.validateGenerationRequest(sanitizedRequest)
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        }
      }

      // Get template
      const template = this.templates.get(sanitizedRequest.templateId)
      if (!template) {
        return {
          success: false,
          errors: [{
            field: 'templateId',
            message: 'Template not found',
            code: 'TEMPLATE_NOT_FOUND',
            severity: 'error'
          }]
        }
      }

      // Check cache for performance (with security considerations)
      const cacheKey = this.generateCacheKey(sanitizedRequest)
      const cachedDocument = this.generationCache.get(cacheKey)
      if (cachedDocument && this.isCacheValid(cachedDocument)) {
        this.logAudit('viewed', cachedDocument.id, { source: 'cache' })
        return {
          success: true,
          document: cachedDocument
        }
      }

      // Generate document content
      const content = await this.processTemplate(template, sanitizedRequest)
      const htmlContent = this.generateHtmlContent(content, template)

      // Create document metadata
      const metadata: DocumentMetadata = {
        jurisdiction: sanitizedRequest.userCase.jurisdiction,
        caseId: sanitizedRequest.userCase.id,
        attorneyReviewRequired: this.requiresAttorneyReview(template, sanitizedRequest),
        attorneyReviewed: false,
        customData: sanitizedRequest.customFields || {}
      }

      // Create generated document
      const document: GeneratedDocument = {
        id: dataSecurityService.generateSecureId(),
        templateId: template.id,
        documentType: template.type,
        title: this.generateDocumentTitle(template, sanitizedRequest),
        content,
        htmlContent,
        metadata,
        status: metadata.attorneyReviewRequired ? 'review_required' : 'generated',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Security: Encrypt sensitive document content
      if (this.containsSensitiveData(document)) {
        document.content = dataSecurityService.encryptData(document.content)
      }

      // Cache the result (with TTL for security)
      this.cacheDocument(cacheKey, document)

      // Audit logging
      this.logAudit('created', document.id, {
        templateId: template.id,
        jurisdiction: metadata.jurisdiction,
        generationTime: performance.now() - startTime
      })

      return {
        success: true,
        document,
        warnings: this.generateWarnings(template, sanitizedRequest)
      }

    } catch (error) {
      console.error('Document generation failed:', error)
      
      return {
        success: false,
        errors: [{
          field: 'general',
          message: 'Document generation failed due to an internal error',
          code: 'GENERATION_ERROR',
          severity: 'error'
        }]
      }
    }
  }

  /**
   * Validate a document template for correctness and security
   */
  validateTemplate(template: DocumentTemplate): ValidationResult {
    const errors: DocumentError[] = []
    const warnings: string[] = []

    // Basic validation
    if (!template.id || !template.name || !template.template) {
      errors.push({
        field: 'template',
        message: 'Template missing required fields',
        code: 'INVALID_TEMPLATE',
        severity: 'error'
      })
    }

    // Security validation - check for potential injection attacks
    if (this.containsPotentialInjection(template.template)) {
      errors.push({
        field: 'template',
        message: 'Template contains potentially unsafe content',
        code: 'SECURITY_VIOLATION',
        severity: 'error'
      })
    }

    // Performance validation - check template complexity
    if (this.isTemplateComplex(template)) {
      warnings.push('Template is complex and may have slower generation times')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Generate a preview of the document without full processing
   */
  async previewDocument(request: DocumentGenerationRequest): Promise<string> {
    const sanitizedRequest = this.sanitizeRequest(request)
    const template = this.templates.get(sanitizedRequest.templateId)
    
    if (!template) {
      throw new Error('Template not found')
    }

    // Generate a simplified preview (first 500 characters)
    const content = await this.processTemplate(template, sanitizedRequest)
    return content.substring(0, 500) + (content.length > 500 ? '...' : '')
  }

  /**
   * Get required fields for a specific template
   */
  getRequiredFields(templateId: string): DocumentField[] {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    return template.requiredFields.filter(field => field.required)
  }

  /**
   * Security: Sanitize generation request to prevent injection attacks
   */
  private sanitizeRequest(request: DocumentGenerationRequest): DocumentGenerationRequest {
    // Handle null/undefined userCase
    if (!request.userCase) {
      return request
    }

    return {
      ...request,
      userCase: {
        ...request.userCase,
        offense: dataSecurityService.sanitizeInput(request.userCase.offense)
      },
      customFields: request.customFields ? 
        Object.fromEntries(
          Object.entries(request.customFields).map(([key, value]) => [
            key,
            typeof value === 'string' ? dataSecurityService.sanitizeInput(value) : value
          ])
        ) : {}
    }
  }

  /**
   * Validate generation request for completeness and security
   */
  private validateGenerationRequest(request: DocumentGenerationRequest): ValidationResult {
    const errors: DocumentError[] = []
    const warnings: string[] = []

    // Validate required fields
    if (!request.templateId) {
      errors.push({
        field: 'templateId',
        message: 'Template ID is required',
        code: 'MISSING_TEMPLATE_ID',
        severity: 'error'
      })
    }

    if (!request.userCase || !request.userCase.id) {
      errors.push({
        field: 'userCase',
        message: 'Valid user case is required',
        code: 'MISSING_USER_CASE',
        severity: 'error'
      })
    }

    // Security validation
    if (request.customFields) {
      for (const [key, value] of Object.entries(request.customFields)) {
        if (typeof value === 'string' && !dataSecurityService.validateInput(value)) {
          errors.push({
            field: key,
            message: 'Field contains invalid or potentially malicious content',
            code: 'INVALID_INPUT',
            severity: 'error'
          })
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Process template with user data using secure templating
   */
  private async processTemplate(
    template: DocumentTemplate, 
    request: DocumentGenerationRequest
  ): Promise<string> {
    let content = template.template

    // Create safe data context for template processing
    const templateData = {
      userCase: request.userCase,
      additionalFactors: request.additionalFactors,
      customFields: request.customFields || {},
      currentDate: new Date().toLocaleDateString(),
      jurisdiction: request.userCase.jurisdiction.toUpperCase()
    }

    // Process template variables safely (prevent code injection)
    content = this.replaceTemplateVariables(content, templateData)

    // Process conditional sections
    content = this.processConditionalSections(content, templateData)

    return content
  }

  /**
   * Replace template variables with actual values (SECURE VERSION)
   * Implements whitelist-based variable access and input sanitization
   */
  private replaceTemplateVariables(template: string, data: any): string {
    const { securityConfig } = require('../config/security')
    const { SecureErrorFactory } = require('../utils/secureError')
    
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const cleanPath = path.trim()
      
      // Security: Only allow whitelisted template variables
      if (!securityConfig.template.allowedVariables.includes(cleanPath)) {
        console.warn(`🚨 SECURITY: Blocked unauthorized template variable: ${cleanPath}`)
        
        // Log security event but don't throw - return safe placeholder instead
        try {
          throw SecureErrorFactory.templateInjection(cleanPath, {
            template: template.substring(0, 100) + '...',
            attemptedPath: cleanPath,
            timestamp: new Date().toISOString()
          })
        } catch (securityError: any) {
          // Log the security event but continue processing
          console.error('Security violation logged:', securityError?.message || 'Unknown security error')
        }
        
        return '[BLOCKED_VARIABLE]'
      }
      
      // Check for dangerous patterns in the path
      for (const pattern of securityConfig.template.blockedPatterns) {
        if (pattern.test(cleanPath)) {
          console.warn(`🚨 SECURITY: Dangerous pattern detected in template variable: ${cleanPath}`)
          return '[BLOCKED_PATTERN]'
        }
      }
      
      const value = this.getNestedValue(data, cleanPath)
      return value !== undefined ? this.sanitizeTemplateValue(String(value)) : match
    })
  }

  /**
   * Safely get nested object values without eval
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  /**
   * Process conditional template sections
   */
  private processConditionalSections(template: string, data: any): string {
    // Process {{#if condition}} sections
    return template.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      try {
        const conditionResult = this.evaluateCondition(condition.trim(), data)
        return conditionResult ? content : ''
      } catch (error) {
        console.warn('Conditional section processing failed:', condition, error)
        return ''
      }
    })
  }

  /**
   * Safely evaluate template conditions
   */
  private evaluateCondition(condition: string, data: any): boolean {
    try {
      // Better parsing approach - find the operator first to avoid undefined issues
      const operatorMatch = condition.match(/\s+(===|!==|==|!=)\s+/)
      if (!operatorMatch || !operatorMatch[0] || !operatorMatch[1]) {
        console.warn('No valid operator found in condition:', condition)
        return false
      }
      
      const operator = operatorMatch[1]
      const fullMatch = operatorMatch[0]
      const operatorIndex = condition.indexOf(fullMatch)
      
      if (operatorIndex === -1) {
        console.warn('Operator index not found in condition:', condition)
        return false
      }
      
      // Extract path and value using substring (guaranteed to return strings)
      const path = condition.substring(0, operatorIndex).trim()
      const rawValue = condition.substring(operatorIndex + fullMatch.length).trim()
      
      // Validate that we have both path and value
      if (!path || !rawValue) {
        console.warn('Missing path or value in condition:', { path, rawValue, condition })
        return false
      }

      const actualValue = this.getNestedValue(data, path)
      
      // Clean the expected value (remove quotes) - handle boolean values
      let expectedValue: string | boolean = ''
      if (rawValue) {
        expectedValue = (rawValue as string).replace(/^['"]|['"]$/g, '')
        
        // Handle boolean values
        if (expectedValue === 'true') {
          expectedValue = true
        } else if (expectedValue === 'false') {
          expectedValue = false
        }
      }

      switch (operator) {
        case '===':
        case '==':
          return actualValue == expectedValue
        case '!==':
        case '!=':
          return actualValue != expectedValue
        default:
          console.warn('Unknown operator in condition:', operator)
          return false
      }
    } catch (error) {
      console.warn('Condition evaluation failed:', condition, error)
      return false
    }
  }

  /**
   * Generate HTML content for document preview
   */
  private generateHtmlContent(content: string, template: DocumentTemplate): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${template.name}</title>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .content { white-space: pre-wrap; }
            .signature-line { border-bottom: 1px solid #000; width: 300px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${template.name}</h1>
          </div>
          <div class="content">${content}</div>
        </body>
      </html>
    `
  }

  /**
   * Generate secure cache key using cryptographic hashing
   */
  private generateCacheKey(request: DocumentGenerationRequest): string {
    const crypto = require('crypto')
    const { securityConfig } = require('../config/security')
    
    const keyData = {
      templateId: request.templateId,
      caseId: request.userCase.id,
      customFields: request.customFields,
      timestamp: Math.floor(Date.now() / (1000 * 60 * 5)) // 5-minute buckets for cache invalidation
    }
    
    // Use cryptographically secure hashing with salt
    const hash = crypto.createHash('sha256')
    const salt = securityConfig?.cache?.keySalt || 'default-salt'
    hash.update(salt)
    hash.update(JSON.stringify(keyData))
    
    return hash.digest('hex').substring(0, 32)
  }

  /**
   * Check if cached document is still valid
   */
  private isCacheValid(document: GeneratedDocument): boolean {
    const { securityConfig } = require('../config/security')
    const cacheAgeMinutes = (Date.now() - document.createdAt.getTime()) / (1000 * 60)
    return cacheAgeMinutes < securityConfig.cache.ttlMinutes
  }

  /**
   * Cache document with security considerations
   */
  private cacheDocument(key: string, document: GeneratedDocument): void {
    const { securityConfig } = require('../config/security')
    
    // Limit cache size for memory management
    if (this.generationCache.size >= securityConfig.cache.maxSize) {
      const oldestKey = this.generationCache.keys().next().value
      this.generationCache.delete(oldestKey)
    }

    this.generationCache.set(key, document)
  }

  /**
   * Determine if attorney review is required
   */
  private requiresAttorneyReview(template: DocumentTemplate, request: DocumentGenerationRequest): boolean {
    // Complex cases require attorney review
    if (template.type === 'petition_expungement' && request.userCase.outcome === 'convicted') {
      return true
    }

    // Felony cases require attorney review
    if (request.userCase.offense.toLowerCase().includes('felony')) {
      return true
    }

    return false
  }

  /**
   * Check if document contains sensitive data requiring encryption
   */
  private containsSensitiveData(document: GeneratedDocument): boolean {
    const sensitivePatterns = [
      /social security/i,
      /ssn/i,
      /date of birth/i,
      /driver.?license/i,
      /address/i
    ]

    return sensitivePatterns.some(pattern => pattern.test(document.content))
  }

  /**
   * Security check for potential template injection
   */
  private containsPotentialInjection(template: string): boolean {
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /eval\(/i,
      /function\(/i,
      /new Function/i
    ]

    return dangerousPatterns.some(pattern => pattern.test(template))
  }

  /**
   * Check if template is complex (performance consideration)
   */
  private isTemplateComplex(template: DocumentTemplate): boolean {
    return template.template.length > 10000 || 
           template.requiredFields.length > 50 ||
           (template.conditionalFields?.length || 0) > 20
  }

  /**
   * Generate document title based on template and case data
   */
  private generateDocumentTitle(template: DocumentTemplate, request: DocumentGenerationRequest): string {
    const caseInfo = `${request.userCase.offense} - ${request.userCase.offenseDate.getFullYear()}`
    return `${template.name} - ${caseInfo}`
  }

  /**
   * Generate warnings for document generation
   */
  private generateWarnings(template: DocumentTemplate, request: DocumentGenerationRequest): string[] {
    const warnings: string[] = []

    if (this.requiresAttorneyReview(template, request)) {
      warnings.push('This document requires attorney review before filing')
    }

    if (request.userCase.ageAtOffense < 18) {
      warnings.push('Special juvenile procedures may apply')
    }

    return warnings
  }

  /**
   * Sanitize template values to prevent injection attacks
   */
  private sanitizeTemplateValue(value: string): string {
    const { securityConfig } = require('../config/security')
    
    let sanitized = value
    
    // Remove dangerous patterns
    for (const pattern of securityConfig.template.blockedPatterns) {
      sanitized = sanitized.replace(pattern, '[BLOCKED]')
    }
    
    // Additional sanitization
    sanitized = sanitized
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data: URLs
      .trim()
    
    // Validate against allowed character set
    if (!securityConfig.validation.allowedCharsets.test(sanitized)) {
      console.warn('🚨 SECURITY: Invalid characters detected in template value')
      // Replace invalid characters with safe alternatives
      sanitized = sanitized.replace(/[^\w\s\-.,!?()'"\/\n\r]/g, '')
    }
    
    // Enforce length limits
    if (sanitized.length > securityConfig.validation.maxFieldLength) {
      sanitized = sanitized.substring(0, securityConfig.validation.maxFieldLength) + '...[TRUNCATED]'
    }
    
    return sanitized
  }

  /**
   * Audit logging for security and compliance
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
   * Initialize default templates
   */
  private initializeTemplates(): void {
    // This will be populated with actual templates in the next piece
    // For now, we'll add a placeholder
  }

  /**
   * Get audit logs for compliance reporting
   */
  getAuditLogs(documentId?: string): DocumentAuditLog[] {
    if (documentId) {
      return this.auditLogs.filter(log => log.documentId === documentId)
    }
    return [...this.auditLogs]
  }

  /**
   * Clear cache and audit logs (for testing/cleanup)
   */
  clearCache(): void {
    this.generationCache.clear()
    this.auditLogs.length = 0
  }
}

// Export singleton instance
export const documentTemplateEngine = DocumentTemplateEngine.getInstance()
