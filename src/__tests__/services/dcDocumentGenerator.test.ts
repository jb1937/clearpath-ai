import { describe, it, expect, beforeEach, vi } from 'vitest'
import { dcDocumentGenerator, DCDocumentGenerator } from '../../services/dcDocumentGenerator'
import { legalDataValidator } from '../../services/legalDataValidator'
import { dataSecurityService } from '../../services/dataSecurity'
import type { UserCase, AdditionalFactors } from '../../types'
import type { DocumentType } from '../../types/documents'

/**
 * Comprehensive Test Suite for DC Document Generator
 * 
 * Tests cover:
 * 1. Document package generation
 * 2. Individual document generation
 * 3. Template processing
 * 4. Filing instructions generation
 * 5. Fee calculations
 * 6. Error handling and edge cases
 * 7. Security validation
 * 8. Performance under load
 */

// Mock dependencies
vi.mock('../../services/legalDataValidator', () => ({
  legalDataValidator: {
    validateComplete: vi.fn()
  }
}))

vi.mock('../../services/dataSecurity', () => ({
  dataSecurityService: {
    generateSecureId: vi.fn(() => `test_id_${Date.now()}`),
    sanitizeInput: vi.fn((input: string) => input.replace(/<script>/gi, '')),
    validateInput: vi.fn((input: string) => !input.includes('<script>')),
    encryptData: vi.fn((data: string) => `encrypted_${data}`)
  }
}))

vi.mock('../../services/documentTemplateEngine', () => ({
  documentTemplateEngine: {
    generateDocument: vi.fn()
  }
}))

describe('DCDocumentGenerator', () => {
  let generator: DCDocumentGenerator
  let mockUserCase: UserCase
  let mockAdditionalFactors: AdditionalFactors
  let mockPersonalInfo: any

  beforeEach(() => {
    generator = DCDocumentGenerator.getInstance()
    
    // Reset mocks
    vi.clearAllMocks()
    
    // Valid test data
    mockUserCase = {
      id: 'dc-case-123',
      offense: 'Simple Assault',
      offenseDate: new Date('2020-01-15'),
      outcome: 'convicted',
      ageAtOffense: 25,
      isTraffickingRelated: false,
      jurisdiction: 'dc',
      sentence: {
        jailTime: 0,
        probation: 12,
        fines: 500,
        communityService: 40,
        allCompleted: true,
        completionDate: new Date('2021-01-15')
      }
    }

    mockAdditionalFactors = {
      hasOpenCases: false,
      isTraffickingVictim: false,
      seekingActualInnocence: false,
      additionalInfo: 'Standard expungement case'
    }

    mockPersonalInfo = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-01-01'),
      address: '123 Main St, Washington, DC 20001',
      phone: '(555) 123-4567',
      email: 'john.doe@example.com'
    }

    // Setup default mock responses
    vi.mocked(legalDataValidator.validateComplete).mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    })
  })

  describe('Document Package Generation', () => {
    it('should generate a complete expungement package successfully', async () => {
      // Mock successful document generation
      const mockDocument = {
        id: 'doc-123',
        templateId: 'dc_petition_expungement',
        documentType: 'petition_expungement' as DocumentType,
        title: 'DC Petition for Expungement - Simple Assault - 2020',
        content: 'PETITION FOR EXPUNGEMENT...',
        htmlContent: '<html>...</html>',
        metadata: {
          jurisdiction: 'dc',
          caseId: 'dc-case-123',
          attorneyReviewRequired: false,
          attorneyReviewed: false,
          customData: {}
        },
        status: 'generated' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { documentTemplateEngine } = await import('../../services/documentTemplateEngine')
      vi.mocked(documentTemplateEngine.generateDocument).mockResolvedValue({
        success: true,
        document: mockDocument
      })

      const result = await generator.generateExpungementPackage(
        mockUserCase,
        mockAdditionalFactors,
        mockPersonalInfo
      )

      expect(result.success).toBe(true)
      expect(result.package).toBeDefined()
      expect(result.package!.packageType).toBe('expungement')
      expect(result.package!.documents.length).toBeGreaterThan(0)
      expect(result.package!.filingInstructions.length).toBeGreaterThan(0)
      expect(result.package!.requiredFees.length).toBeGreaterThan(0)
    })

    it('should generate actual innocence package when requested', async () => {
      const innocenceFactors = {
        ...mockAdditionalFactors,
        seekingActualInnocence: true
      }

      const mockDocument = {
        id: 'doc-123',
        templateId: 'dc_petition_actual_innocence',
        documentType: 'petition_actual_innocence' as DocumentType,
        title: 'DC Petition for Actual Innocence',
        content: 'PETITION FOR ACTUAL INNOCENCE...',
        htmlContent: '<html>...</html>',
        metadata: {
          jurisdiction: 'dc',
          caseId: 'dc-case-123',
          attorneyReviewRequired: true,
          attorneyReviewed: false,
          customData: {}
        },
        status: 'review_required' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { documentTemplateEngine } = await import('../../services/documentTemplateEngine')
      vi.mocked(documentTemplateEngine.generateDocument).mockResolvedValue({
        success: true,
        document: mockDocument
      })

      const result = await generator.generateExpungementPackage(
        mockUserCase,
        innocenceFactors,
        mockPersonalInfo
      )

      expect(result.success).toBe(true)
      expect(result.package!.packageType).toBe('actual_innocence')
      expect(result.package!.documents.some(d => d.documentType === 'petition_actual_innocence')).toBe(true)
    })

    it('should handle validation failures', async () => {
      vi.mocked(legalDataValidator.validateComplete).mockReturnValue({
        isValid: false,
        errors: [{
          field: 'offense',
          message: 'Invalid offense type',
          code: 'INVALID_OFFENSE',
          severity: 'error'
        }],
        warnings: [],
        suggestions: []
      })

      const result = await generator.generateExpungementPackage(
        mockUserCase,
        mockAdditionalFactors,
        mockPersonalInfo
      )

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].code).toBe('INVALID_OFFENSE')
    })

    it('should include trafficking victim documents when applicable', async () => {
      const traffickingFactors = {
        ...mockAdditionalFactors,
        isTraffickingVictim: true
      }

      const mockDocument = {
        id: 'doc-123',
        templateId: 'dc_petition_expungement',
        documentType: 'petition_expungement' as DocumentType,
        title: 'DC Petition for Expungement',
        content: 'PETITION FOR EXPUNGEMENT...',
        htmlContent: '<html>...</html>',
        metadata: {
          jurisdiction: 'dc',
          caseId: 'dc-case-123',
          attorneyReviewRequired: false,
          attorneyReviewed: false,
          customData: {}
        },
        status: 'generated' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { documentTemplateEngine } = await import('../../services/documentTemplateEngine')
      vi.mocked(documentTemplateEngine.generateDocument).mockResolvedValue({
        success: true,
        document: mockDocument
      })

      const result = await generator.generateExpungementPackage(
        mockUserCase,
        traffickingFactors,
        mockPersonalInfo
      )

      expect(result.success).toBe(true)
      // Should include trafficking victim affidavit
      expect(result.package!.documents.some(d => d.documentType === 'trafficking_victim_affidavit')).toBe(true)
    })
  })

  describe('Individual Document Generation', () => {
    it('should generate a single document successfully', async () => {
      const mockDocument = {
        id: 'doc-123',
        templateId: 'dc_petition_expungement',
        documentType: 'petition_expungement' as DocumentType,
        title: 'DC Petition for Expungement',
        content: 'PETITION FOR EXPUNGEMENT...',
        htmlContent: '<html>...</html>',
        metadata: {
          jurisdiction: 'dc',
          caseId: 'dc-case-123',
          attorneyReviewRequired: false,
          attorneyReviewed: false,
          customData: {}
        },
        status: 'generated' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { documentTemplateEngine } = await import('../../services/documentTemplateEngine')
      vi.mocked(documentTemplateEngine.generateDocument).mockResolvedValue({
        success: true,
        document: mockDocument
      })

      const result = await generator.generateSingleDocument(
        'petition_expungement',
        mockUserCase,
        mockAdditionalFactors,
        mockPersonalInfo
      )

      expect(result.success).toBe(true)
      expect(result.document).toBeDefined()
      expect(result.document!.documentType).toBe('petition_expungement')
      expect(result.document!.metadata.jurisdiction).toBe('dc')
      expect(result.document!.metadata.courtName).toBe('Superior Court of the District of Columbia')
    })

    it('should handle missing template', async () => {
      const result = await generator.generateSingleDocument(
        'nonexistent_template' as DocumentType,
        mockUserCase,
        mockAdditionalFactors,
        mockPersonalInfo
      )

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].code).toBe('TEMPLATE_NOT_FOUND')
    })

    it('should handle template engine failures', async () => {
      const { documentTemplateEngine } = await import('../../services/documentTemplateEngine')
      vi.mocked(documentTemplateEngine.generateDocument).mockResolvedValue({
        success: false,
        errors: [{
          field: 'template',
          message: 'Template processing failed',
          code: 'TEMPLATE_ERROR',
          severity: 'error'
        }]
      })

      const result = await generator.generateSingleDocument(
        'petition_expungement',
        mockUserCase,
        mockAdditionalFactors,
        mockPersonalInfo
      )

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].code).toBe('TEMPLATE_ERROR')
    })
  })

  describe('Filing Instructions Generation', () => {
    it('should generate comprehensive filing instructions', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          templateId: 'dc_petition_expungement',
          documentType: 'petition_expungement' as DocumentType,
          title: 'DC Petition for Expungement',
          content: 'content',
          htmlContent: 'html',
          status: 'ready_to_file' as const,
          metadata: {
            jurisdiction: 'dc' as const,
            caseId: 'dc-case-123',
            courtName: 'Superior Court of the District of Columbia',
            filingFee: 50,
            requiredCopies: 3,
            specialInstructions: ['Must be notarized']
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const instructions = (generator as any).generateFilingInstructions(mockUserCase, mockDocuments)

      expect(instructions).toContain('File all documents with the Superior Court of the District of Columbia')
      expect(instructions).toContain('Pay filing fees totaling $50')
      expect(instructions).toContain('Allow 60-90 days for court processing')
    })

    it('should include service instructions for certificate of service', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          templateId: 'dc_certificate_of_service',
          documentType: 'certificate_of_service' as DocumentType,
          title: 'DC Certificate of Service',
          content: 'content',
          htmlContent: 'html',
          status: 'ready_to_file' as const,
          metadata: {
            jurisdiction: 'dc' as const,
            caseId: 'dc-case-123',
            courtName: 'Superior Court of the District of Columbia',
            filingFee: 0,
            requiredCopies: 2,
            specialInstructions: []
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const instructions = (generator as any).generateFilingInstructions(mockUserCase, mockDocuments)

      expect(instructions.some(i => i.includes('U.S. Attorney\'s Office'))).toBe(true)
      expect(instructions.some(i => i.includes('Metropolitan Police Department'))).toBe(true)
    })

    it('should include trafficking-specific instructions', async () => {
      const traffickingCase = {
        ...mockUserCase,
        isTraffickingRelated: true
      }

      const instructions = (generator as any).generateFilingInstructions(traffickingCase, [])

      expect(instructions.some(i => i.includes('expedited processing'))).toBe(true)
    })
  })

  describe('Fee Calculations', () => {
    it('should calculate filing fees correctly', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          documentType: 'petition_expungement' as DocumentType,
          metadata: { filingFee: 50 }
        },
        {
          id: 'doc-2',
          documentType: 'certificate_of_service' as DocumentType,
          metadata: { filingFee: 0 }
        }
      ] as any[]

      const fees = (generator as any).calculateFilingFees(mockDocuments)

      expect(fees).toHaveLength(1) // Only petition has fee
      expect(fees[0].amount).toBe(50)
      expect(fees[0].documentType).toBe('petition_expungement')
      expect(fees[0].payableTo).toBe('D.C. Superior Court')
    })

    it('should handle actual innocence petitions (no fee)', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          documentType: 'petition_actual_innocence' as DocumentType,
          metadata: { filingFee: 0 }
        }
      ] as any[]

      const fees = (generator as any).calculateFilingFees(mockDocuments)

      expect(fees).toHaveLength(1)
      expect(fees[0].amount).toBe(0)
      expect(fees[0].waiverAvailable).toBe(false)
    })

    it('should indicate fee waiver availability', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          documentType: 'petition_expungement' as DocumentType,
          metadata: { filingFee: 50 }
        }
      ] as any[]

      const fees = (generator as any).calculateFilingFees(mockDocuments)

      expect(fees[0].waiverAvailable).toBe(true)
    })
  })

  describe('Processing Time Estimation', () => {
    it('should estimate standard processing time', () => {
      const estimatedTime = (generator as any).estimateProcessingTime(mockUserCase, mockAdditionalFactors)

      expect(estimatedTime).toMatch(/\d+-\d+ days/)
      expect(estimatedTime).toContain('90-120 days') // Convicted case + base time
    })

    it('should account for actual innocence complexity', () => {
      const innocenceFactors = {
        ...mockAdditionalFactors,
        seekingActualInnocence: true
      }

      const estimatedTime = (generator as any).estimateProcessingTime(mockUserCase, innocenceFactors)

      expect(estimatedTime).toContain('150-180 days') // Additional 60 days for complexity
    })

    it('should reduce time for trafficking victims', () => {
      const traffickingFactors = {
        ...mockAdditionalFactors,
        isTraffickingVictim: true
      }

      const nonTraffickingCase = {
        ...mockUserCase,
        outcome: 'dismissed' as const
      }

      const estimatedTime = (generator as any).estimateProcessingTime(nonTraffickingCase, traffickingFactors)

      expect(estimatedTime).toContain('30-60 days') // Reduced for trafficking victims
    })
  })

  describe('Document Type Determination', () => {
    it('should determine standard expungement documents', () => {
      const documents = (generator as any).determineRequiredDocuments(mockUserCase, mockAdditionalFactors)

      expect(documents).toContain('petition_expungement')
      expect(documents).toContain('affidavit_expungement')
      expect(documents).toContain('certificate_of_service')
      expect(documents).toContain('proposed_order')
    })

    it('should include conviction-specific documents', () => {
      const documents = (generator as any).determineRequiredDocuments(mockUserCase, mockAdditionalFactors)

      expect(documents).toContain('certificate_completion')
      expect(documents).toContain('probation_completion_certificate') // Has probation
    })

    it('should determine actual innocence documents', () => {
      const innocenceFactors = {
        ...mockAdditionalFactors,
        seekingActualInnocence: true
      }

      const documents = (generator as any).determineRequiredDocuments(mockUserCase, innocenceFactors)

      expect(documents).toContain('petition_actual_innocence')
      expect(documents).toContain('affidavit_actual_innocence')
      expect(documents).toContain('memorandum_actual_innocence')
    })

    it('should include trafficking victim documents', () => {
      const traffickingFactors = {
        ...mockAdditionalFactors,
        isTraffickingVictim: true
      }

      const documents = (generator as any).determineRequiredDocuments(mockUserCase, traffickingFactors)

      expect(documents).toContain('trafficking_victim_affidavit')
    })
  })

  describe('Template and Fee Lookups', () => {
    it('should map document types to template IDs correctly', () => {
      const templateId = (generator as any).getTemplateIdForDocumentType('petition_expungement')
      expect(templateId).toBe('dc_petition_expungement')

      const unknownTemplateId = (generator as any).getTemplateIdForDocumentType('unknown_type' as DocumentType)
      expect(unknownTemplateId).toBe('unknown_type')
    })

    it('should return correct filing fees', () => {
      const expungementFee = (generator as any).getFilingFee('petition_expungement')
      expect(expungementFee).toBe(50)

      const serviceFee = (generator as any).getFilingFee('certificate_of_service')
      expect(serviceFee).toBe(0)

      const innocenceFee = (generator as any).getFilingFee('petition_actual_innocence')
      expect(innocenceFee).toBe(0)
    })

    it('should return correct copy requirements', () => {
      const expungementCopies = (generator as any).getRequiredCopies('petition_expungement')
      expect(expungementCopies).toBe(3)

      const serviceCopies = (generator as any).getRequiredCopies('certificate_of_service')
      expect(serviceCopies).toBe(2)

      const unknownCopies = (generator as any).getRequiredCopies('unknown_type' as DocumentType)
      expect(unknownCopies).toBe(2) // Default
    })
  })

  describe('Special Instructions', () => {
    it('should provide document-specific instructions', () => {
      const expungementInstructions = (generator as any).getSpecialInstructions('petition_expungement', mockUserCase)
      expect(expungementInstructions).toContain('Must be notarized')
      expect(expungementInstructions).toContain('Attach certified copies of court records')

      const serviceInstructions = (generator as any).getSpecialInstructions('certificate_of_service', mockUserCase)
      expect(serviceInstructions).toContain('Must be filed within 3 days of service')

      const innocenceInstructions = (generator as any).getSpecialInstructions('petition_actual_innocence', mockUserCase)
      expect(innocenceInstructions).toContain('Must include new evidence of innocence')
    })

    it('should handle documents without special instructions', () => {
      const instructions = (generator as any).getSpecialInstructions('proposed_order', mockUserCase)
      expect(instructions).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle document generation errors gracefully', async () => {
      const { documentTemplateEngine } = await import('../../services/documentTemplateEngine')
      vi.mocked(documentTemplateEngine.generateDocument).mockRejectedValue(new Error('Template error'))

      const result = await generator.generateExpungementPackage(
        mockUserCase,
        mockAdditionalFactors,
        mockPersonalInfo
      )

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].code).toBe('PACKAGE_GENERATION_ERROR')
    })

    it('should handle partial document generation failures', async () => {
      const { documentTemplateEngine } = await import('../../services/documentTemplateEngine')
      
      // First call succeeds, second fails
      vi.mocked(documentTemplateEngine.generateDocument)
        .mockResolvedValueOnce({
          success: true,
          document: {
            id: 'doc-1',
            templateId: 'dc_petition_expungement',
            documentType: 'petition_expungement' as DocumentType,
            title: 'DC Petition for Expungement',
            content: 'content',
            htmlContent: 'html',
            metadata: {
              jurisdiction: 'dc',
              caseId: 'dc-case-123',
              attorneyReviewRequired: false,
              attorneyReviewed: false,
              customData: {}
            },
            status: 'generated' as const,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        .mockResolvedValueOnce({
          success: false,
          errors: [{
            field: 'template',
            message: 'Template not found',
            code: 'TEMPLATE_NOT_FOUND',
            severity: 'error'
          }]
        })

      const result = await generator.generateExpungementPackage(
        mockUserCase,
        mockAdditionalFactors,
        mockPersonalInfo
      )

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].code).toBe('TEMPLATE_NOT_FOUND')
    })
  })

  describe('Performance Tests', () => {
    it('should generate documents within reasonable time', async () => {
      const mockDocument = {
        id: 'doc-123',
        templateId: 'dc_petition_expungement',
        documentType: 'petition_expungement' as DocumentType,
        title: 'DC Petition for Expungement',
        content: 'content',
        htmlContent: 'html',
        metadata: {
          jurisdiction: 'dc',
          caseId: 'dc-case-123',
          attorneyReviewRequired: false,
          attorneyReviewed: false,
          customData: {}
        },
        status: 'generated' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { documentTemplateEngine } = await import('../../services/documentTemplateEngine')
      vi.mocked(documentTemplateEngine.generateDocument).mockResolvedValue({
        success: true,
        document: mockDocument
      })

      const startTime = performance.now()
      
      await generator.generateExpungementPackage(
        mockUserCase,
        mockAdditionalFactors,
        mockPersonalInfo
      )
      
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle concurrent package generation', async () => {
      const mockDocument = {
        id: 'doc-123',
        templateId: 'dc_petition_expungement',
        documentType: 'petition_expungement' as DocumentType,
        title: 'DC Petition for Expungement',
        content: 'content',
        htmlContent: 'html',
        metadata: {
          jurisdiction: 'dc',
          caseId: 'dc-case-123',
          attorneyReviewRequired: false,
          attorneyReviewed: false,
          customData: {}
        },
        status: 'generated' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { documentTemplateEngine } = await import('../../services/documentTemplateEngine')
      vi.mocked(documentTemplateEngine.generateDocument).mockResolvedValue({
        success: true,
        document: mockDocument
      })

      const promises = Array(10).fill(null).map((_, i: number) => {
        const testCase = { ...mockUserCase, id: `concurrent-case-${i}` }
        return generator.generateExpungementPackage(testCase, mockAdditionalFactors, mockPersonalInfo)
      })

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      expect(results.every(r => r.success)).toBe(true)
    })
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DCDocumentGenerator.getInstance()
      const instance2 = DCDocumentGenerator.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should maintain template state across calls', () => {
      const generator1 = DCDocumentGenerator.getInstance()
      const generator2 = DCDocumentGenerator.getInstance()

      // Both should have access to the same templates
      expect((generator1 as any).dcTemplates.size).toBe((generator2 as any).dcTemplates.size)
    })
  })

  describe('Court Name Resolution', () => {
    it('should return correct DC court name', () => {
      const courtName = (generator as any).getDCCourtName(mockUserCase)
      expect(courtName).toBe('Superior Court of the District of Columbia')
    })

    it('should handle different case types consistently', () => {
      const felonyCase = { ...mockUserCase, offense: 'Felony Assault' }
      const misdemeanorCase = { ...mockUserCase, offense: 'Simple Assault' }

      const felonyCourtName = (generator as any).getDCCourtName(felonyCase)
      const misdemeanorCourtName = (generator as any).getDCCourtName(misdemeanorCase)

      expect(felonyCourtName).toBe(misdemeanorCourtName)
      expect(felonyCourtName).toBe('Superior Court of the District of Columbia')
    })
  })
})
