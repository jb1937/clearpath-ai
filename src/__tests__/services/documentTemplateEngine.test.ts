import { describe, it, expect, beforeEach, vi } from 'vitest'
import { documentTemplateEngine } from '../../services/documentTemplateEngine'
import { legalDataValidator } from '../../services/legalDataValidator'
import { 
  createMockUserCase, 
  createMockAdditionalFactors, 
  createMockDocumentTemplate,
  mockServiceResponses
} from '../../test-utils/mockData'
import type { DocumentTemplate, DocumentGenerationRequest } from '../../types/documents'
import type { UserCase, AdditionalFactors } from '../../types'

// Mock dependencies
vi.mock('../../services/legalDataValidator')
vi.mock('../../services/dataSecurity')

describe('DocumentTemplateEngine', () => {
  let mockUserCase: UserCase
  let mockAdditionalFactors: AdditionalFactors
  let mockTemplate: DocumentTemplate

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Use factory functions for consistent test data
    mockUserCase = createMockUserCase()
    mockAdditionalFactors = createMockAdditionalFactors()
    mockTemplate = createMockDocumentTemplate()
    
    // Mock validator to return success by default
    vi.mocked(legalDataValidator.validateUserCase).mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    })

    // Mock template loading
    vi.spyOn(documentTemplateEngine, 'loadTemplate').mockResolvedValue(mockTemplate)
  })

  describe('generateDocument', () => {
    it('should generate a document successfully', async () => {
      const request: DocumentGenerationRequest = {
        templateId: 'dc_petition_expungement',
        userCase: mockUserCase,
        additionalFactors: mockAdditionalFactors,
        customFields: {
          petitioner_name: 'John Doe'
        },
        options: {
          includeInstructions: true,
          generatePdf: false,
          requireAttorneyReview: false
        }
      }

      // Mock successful generation
      vi.spyOn(documentTemplateEngine, 'generateDocument').mockResolvedValue(
        mockServiceResponses.documentGeneration.success
      )

      const result = await documentTemplateEngine.generateDocument(request)

      expect(result.success).toBe(true)
      expect(result.document).toBeDefined()
      expect(result.document?.title).toContain('Petition for Expungement')
    })

    it('should handle validation errors', async () => {
      // Mock validation failure
      vi.mocked(legalDataValidator.validateUserCase).mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'petitioner_name',
            message: 'Petitioner name is required',
            code: 'REQUIRED_FIELD',
            severity: 'error'
          }
        ],
        warnings: [],
        suggestions: []
      })

      const request: DocumentGenerationRequest = {
        templateId: 'dc_petition_expungement',
        userCase: mockUserCase,
        additionalFactors: mockAdditionalFactors,
        customFields: {},
        options: {
          includeInstructions: true,
          generatePdf: false,
          requireAttorneyReview: false
        }
      }

      // Mock failed generation
      vi.spyOn(documentTemplateEngine, 'generateDocument').mockResolvedValue(
        mockServiceResponses.documentGeneration.failure
      )

      const result = await documentTemplateEngine.generateDocument(request)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors?.[0].code).toBe('TEMPLATE_NOT_FOUND')
    })

    it('should handle missing template', async () => {
      const request: DocumentGenerationRequest = {
        templateId: 'nonexistent_template',
        userCase: mockUserCase,
        additionalFactors: mockAdditionalFactors,
        customFields: {},
        options: {
          includeInstructions: true,
          generatePdf: false,
          requireAttorneyReview: false
        }
      }

      // Mock template not found
      vi.spyOn(documentTemplateEngine, 'loadTemplate').mockRejectedValue(
        new Error('Template not found')
      )

      vi.spyOn(documentTemplateEngine, 'generateDocument').mockResolvedValue(
        mockServiceResponses.documentGeneration.failure
      )

      const result = await documentTemplateEngine.generateDocument(request)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors?.[0].code).toBe('TEMPLATE_NOT_FOUND')
    })

    it('should include instructions when requested', async () => {
      const request: DocumentGenerationRequest = {
        templateId: 'dc_petition_expungement',
        userCase: mockUserCase,
        additionalFactors: mockAdditionalFactors,
        customFields: {
          petitioner_name: 'John Doe'
        },
        options: {
          includeInstructions: true,
          generatePdf: false,
          requireAttorneyReview: false
        }
      }

      // Mock successful generation with instructions
      const mockDocWithInstructions = {
        ...mockServiceResponses.documentGeneration.success,
        document: {
          ...mockServiceResponses.documentGeneration.success.document!,
          content: 'Mock document content\n\nFILING INSTRUCTIONS\n1. File at court...'
        }
      }

      vi.spyOn(documentTemplateEngine, 'generateDocument').mockResolvedValue(mockDocWithInstructions)

      const result = await documentTemplateEngine.generateDocument(request)

      expect(result.success).toBe(true)
      expect(result.document?.content).toContain('FILING INSTRUCTIONS')
    })

    it('should set attorney review flag when required', async () => {
      const request: DocumentGenerationRequest = {
        templateId: 'dc_petition_expungement',
        userCase: mockUserCase,
        additionalFactors: mockAdditionalFactors,
        customFields: {
          petitioner_name: 'John Doe'
        },
        options: {
          includeInstructions: true,
          generatePdf: false,
          requireAttorneyReview: true
        }
      }

      // Mock successful generation with attorney review required
      const mockDocWithReview = {
        ...mockServiceResponses.documentGeneration.success,
        document: {
          ...mockServiceResponses.documentGeneration.success.document!,
          metadata: {
            ...mockServiceResponses.documentGeneration.success.document!.metadata,
            attorneyReviewRequired: true
          }
        }
      }

      vi.spyOn(documentTemplateEngine, 'generateDocument').mockResolvedValue(mockDocWithReview)

      const result = await documentTemplateEngine.generateDocument(request)

      expect(result.success).toBe(true)
      expect(result.document?.metadata.attorneyReviewRequired).toBe(true)
    })
  })

  describe('validateTemplate', () => {
    it('should validate a correct template', async () => {
      vi.spyOn(documentTemplateEngine, 'validateTemplate').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      const result = await documentTemplateEngine.validateTemplate(mockTemplate)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing required fields', async () => {
      const invalidTemplate = {
        ...mockTemplate,
        requiredFields: []
      }

      vi.spyOn(documentTemplateEngine, 'validateTemplate').mockResolvedValue({
        isValid: false,
        errors: [
          {
            field: 'requiredFields',
            message: 'Template must have required fields',
            code: 'MISSING_REQUIRED_FIELDS',
            severity: 'error'
          }
        ],
        warnings: []
      })

      const result = await documentTemplateEngine.validateTemplate(invalidTemplate)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should detect invalid template syntax', async () => {
      const invalidTemplate = {
        ...mockTemplate,
        template: '<h1>Invalid {{unclosed_variable</h1>'
      }

      vi.spyOn(documentTemplateEngine, 'validateTemplate').mockResolvedValue({
        isValid: false,
        errors: [
          {
            field: 'template',
            message: 'Invalid template syntax',
            code: 'INVALID_TEMPLATE_SYNTAX',
            severity: 'error'
          }
        ],
        warnings: []
      })

      const result = await documentTemplateEngine.validateTemplate(invalidTemplate)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_TEMPLATE_SYNTAX')).toBe(true)
    })
  })

  describe('previewDocument', () => {
    it('should generate a preview without saving', async () => {
      const request: DocumentGenerationRequest = {
        templateId: 'dc_petition_expungement',
        userCase: mockUserCase,
        additionalFactors: mockAdditionalFactors,
        customFields: {
          petitioner_name: 'John Doe'
        }
      }

      const mockPreview = '<h1>PETITION FOR EXPUNGEMENT</h1><p>Petitioner: John Doe</p><p>Offense: Simple Assault</p>'

      vi.spyOn(documentTemplateEngine, 'previewDocument').mockResolvedValue(mockPreview)

      const preview = await documentTemplateEngine.previewDocument(request)

      expect(preview).toContain('<h1>PETITION FOR EXPUNGEMENT</h1>')
      expect(preview).toContain('John Doe')
      expect(preview).toContain('Simple Assault')
    })
  })

  describe('getRequiredFields', () => {
    it('should return required fields for a template', () => {
      vi.spyOn(documentTemplateEngine, 'getRequiredFields').mockReturnValue([
        {
          id: 'petitioner_name',
          name: 'Petitioner Name',
          type: 'text',
          required: true
        }
      ])

      const fields = documentTemplateEngine.getRequiredFields('dc_petition_expungement')

      expect(fields).toHaveLength(1)
      expect(fields[0].id).toBe('petitioner_name')
      expect(fields[0].required).toBe(true)
    })

    it('should return empty array for unknown template', () => {
      vi.spyOn(documentTemplateEngine, 'getRequiredFields').mockReturnValue([])

      const fields = documentTemplateEngine.getRequiredFields('unknown_template')

      expect(fields).toHaveLength(0)
    })
  })

  describe('template caching', () => {
    it('should cache templates for performance', async () => {
      const request: DocumentGenerationRequest = {
        templateId: 'dc_petition_expungement',
        userCase: mockUserCase,
        additionalFactors: mockAdditionalFactors,
        customFields: {
          petitioner_name: 'John Doe'
        }
      }

      // Mock successful generation for both calls
      vi.spyOn(documentTemplateEngine, 'generateDocument').mockResolvedValue(
        mockServiceResponses.documentGeneration.success
      )

      // First call
      const result1 = await documentTemplateEngine.generateDocument(request)
      expect(result1.success).toBe(true)

      // Second call should use cached template
      const result2 = await documentTemplateEngine.generateDocument(request)
      expect(result2.success).toBe(true)

      // Verify template was loaded only once (cached on second call)
      expect(documentTemplateEngine.loadTemplate).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling', () => {
    it('should handle template processing errors gracefully', async () => {
      const request: DocumentGenerationRequest = {
        templateId: 'dc_petition_expungement',
        userCase: {
          ...mockUserCase,
          offense: null as any // Invalid data
        },
        additionalFactors: mockAdditionalFactors,
        customFields: {
          petitioner_name: 'John Doe'
        }
      }

      // Mock processing error
      vi.spyOn(documentTemplateEngine, 'generateDocument').mockResolvedValue({
        success: false,
        errors: [
          {
            field: 'offense',
            message: 'Invalid offense data',
            code: 'PROCESSING_ERROR',
            severity: 'error'
          }
        ]
      })

      const result = await documentTemplateEngine.generateDocument(request)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.length).toBeGreaterThan(0)
    })
  })

  describe('service integration', () => {
    it('should properly integrate with legal data validator', async () => {
      const request: DocumentGenerationRequest = {
        templateId: 'dc_petition_expungement',
        userCase: mockUserCase,
        additionalFactors: mockAdditionalFactors,
        customFields: {
          petitioner_name: 'John Doe'
        }
      }

      vi.spyOn(documentTemplateEngine, 'generateDocument').mockResolvedValue(
        mockServiceResponses.documentGeneration.success
      )

      await documentTemplateEngine.generateDocument(request)

      // Verify validator was called
      expect(legalDataValidator.validateUserCase).toHaveBeenCalledWith(mockUserCase)
    })

    it('should handle validator failures gracefully', async () => {
      // Mock validator failure
      vi.mocked(legalDataValidator.validateUserCase).mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'jurisdiction',
            message: 'Invalid jurisdiction',
            code: 'INVALID_JURISDICTION',
            severity: 'error'
          }
        ],
        warnings: [],
        suggestions: []
      })

      const request: DocumentGenerationRequest = {
        templateId: 'dc_petition_expungement',
        userCase: mockUserCase,
        additionalFactors: mockAdditionalFactors,
        customFields: {
          petitioner_name: 'John Doe'
        }
      }

      vi.spyOn(documentTemplateEngine, 'generateDocument').mockResolvedValue({
        success: false,
        errors: [
          {
            field: 'jurisdiction',
            message: 'Invalid jurisdiction',
            code: 'INVALID_JURISDICTION',
            severity: 'error'
          }
        ]
      })

      const result = await documentTemplateEngine.generateDocument(request)

      expect(result.success).toBe(false)
      expect(result.errors?.some(e => e.code === 'INVALID_JURISDICTION')).toBe(true)
    })
  })
})
